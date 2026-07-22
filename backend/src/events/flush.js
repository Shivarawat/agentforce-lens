import { drainEvents } from '../services/redis.js'
import pool from '../db/pool.js'

// Flush buffered Redis events to PostgreSQL every 5 seconds
export function startFlushWorker(orgIds) {
  setInterval(async () => {
    for (const orgId of orgIds) {
      try {
        const events = await drainEvents(orgId)
        if (!events.length) continue

        for (const e of events) {
          // Upsert conversation record
          await pool.query(
            `INSERT INTO conversations (org_id, session_id, bot_id, channel, status, turn_count, escalated)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (session_id) DO UPDATE
               SET status     = EXCLUDED.status,
                   turn_count = EXCLUDED.turn_count,
                   escalated  = EXCLUDED.escalated,
                   ended_at   = CASE WHEN EXCLUDED.status != 'active' THEN NOW() ELSE conversations.ended_at END`,
            [
              orgId,
              e.SessionId,
              e.BotId,
              e.ChannelType,
              e.Status?.toLowerCase() ?? 'active',
              e.TurnCount ?? 0,
              e.IsEscalated ?? false,
            ]
          )

          // Insert the individual turn if present
          if (e.TurnSequenceNumber != null) {
            await pool.query(
              `INSERT INTO conversation_turns
                 (session_id, org_id, turn_index, user_message, bot_response,
                  topic_name, action_name, action_success, error_message)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
               ON CONFLICT DO NOTHING`,
              [
                e.SessionId, orgId, e.TurnSequenceNumber,
                e.UserMessage, e.BotResponse,
                e.TopicName, e.ActionName,
                e.IsActionSuccessful, e.ErrorMessage,
              ]
            )
          }
        }

        console.log(`[flush] wrote ${events.length} events for org ${orgId}`)
      } catch (err) {
        console.error(`[flush] error for org ${orgId}:`, err.message)
      }
    }
  }, 5000)
}
