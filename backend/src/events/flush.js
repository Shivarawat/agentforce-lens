import * as redis from '../services/redis.js'
import realPool from '../db/pool.js'
import { normalizeEvent } from './normalize.js'

export const BATCH_SIZE = 500

const UPSERT_CONVERSATION = `
  INSERT INTO conversations (org_id, session_id, bot_id, channel, status, turn_count, escalated)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (session_id) DO UPDATE
    -- A re-delivered or out-of-order event (lower turn count) must not overwrite newer state
    SET status     = CASE WHEN EXCLUDED.turn_count >= conversations.turn_count
                          THEN EXCLUDED.status ELSE conversations.status END,
        turn_count = GREATEST(conversations.turn_count, EXCLUDED.turn_count),
        escalated  = conversations.escalated OR EXCLUDED.escalated,
        ended_at   = CASE WHEN EXCLUDED.turn_count >= conversations.turn_count AND EXCLUDED.status != 'active'
                          THEN COALESCE(conversations.ended_at, NOW())
                          ELSE conversations.ended_at END`

// Unique (session_id, turn_index) makes re-delivered events a no-op
const INSERT_TURN = `
  INSERT INTO conversation_turns
    (session_id, org_id, turn_index, user_message, bot_response,
     topic_name, action_name, action_success, error_message)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (session_id, turn_index) DO NOTHING`

// Write one batch of an org's buffered events to Postgres in a single transaction.
// Events are acknowledged (removed from Redis) only after COMMIT; on failure they stay
// buffered and are retried on the next tick. Returns how many events were processed.
export async function flushOrg(orgId, { store = redis, pool = realPool, batchSize = BATCH_SIZE } = {}) {
  const raw = await store.peekEvents(orgId, batchSize)
  if (!raw.length) return { written: 0, skipped: 0 }

  const events = raw.map((payload) => normalizeEvent(payload, orgId))
  const valid = events.filter(Boolean)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const e of valid) {
      await client.query(UPSERT_CONVERSATION, [
        e.orgId, e.sessionId, e.botId, e.channel, e.status, e.turnCount, e.escalated,
      ])
      if (e.turnIndex != null) {
        await client.query(INSERT_TURN, [
          e.sessionId, e.orgId, e.turnIndex, e.userMessage, e.botResponse,
          e.topicName, e.actionName, e.actionSuccess, e.errorMessage,
        ])
      }
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }

  // Invalid events (no session id) can never be stored, so they are dropped with the batch
  await store.ackEvents(orgId, raw.length)
  return { written: valid.length, skipped: raw.length - valid.length }
}

// Flush every connected org every `intervalMs`. Orgs are re-read on each tick, so orgs
// connected after startup are included, and ticks never overlap.
export function startFlushWorker({ intervalMs = 5000, pool = realPool } = {}) {
  let running = false

  const timer = setInterval(async () => {
    if (running) return
    running = true
    try {
      const { rows } = await pool.query('SELECT org_id FROM orgs')
      for (const { org_id: orgId } of rows) {
        try {
          const { written, skipped } = await flushOrg(orgId, { pool })
          if (written || skipped) {
            console.log(`[flush] org ${orgId}: wrote ${written}, skipped ${skipped} invalid`)
          }
        } catch (err) {
          console.error(`[flush] org ${orgId} failed, events kept for retry:`, err.message)
        }
      }
    } catch (err) {
      console.error('[flush] could not list orgs:', err.message)
    } finally {
      running = false
    }
  }, intervalMs)

  return () => clearInterval(timer)
}
