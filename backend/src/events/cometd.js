// Both packages are CommonJS, so their exports come from the default import
import cometdPkg from 'cometd'
import cometdNode from 'cometd-nodejs-client'
import { bufferEvent, getReplayId, setReplayId } from '../services/redis.js'
import { refreshAccessToken } from '../services/salesforce.js'
import { createReplayExtension } from './replayExtension.js'
import pool from '../db/pool.js'

export const AGENT_EVENT_CHANNEL = '/event/AgentConversationEvent__e'

const { CometD } = cometdPkg
cometdNode.adapt()

// One live stream per org, so reconnecting an org never creates a duplicate subscription
const activeStreams = new Map()

export function isAuthError(message) {
  return /\b401\b/.test(String(message?.error ?? ''))
}

function handshake(cometd) {
  return new Promise((resolve, reject) => {
    cometd.handshake((reply) => {
      if (reply.successful) return resolve(reply)
      const err = new Error(reply.error || 'handshake failed')
      err.reply = reply
      reject(err)
    })
  })
}

export function stopStreaming(orgId) {
  const existing = activeStreams.get(orgId)
  if (existing) {
    existing.disconnect()
    activeStreams.delete(orgId)
  }
}

// Start a CometD streaming listener for a specific org
export async function startStreaming(org, { retried = false } = {}) {
  stopStreaming(org.org_id)

  const cometd = new CometD()
  // Salesforce's CometD endpoint only supports long-polling. In Node the client tries
  // WebSocket first and never falls back, so the handshake fails unless we remove it.
  cometd.unregisterTransport('websocket')
  cometd.configure({
    url:            `${org.instance_url}/cometd/59.0`,
    requestHeaders: { Authorization: `Bearer ${org.access_token}` },
    appendMessageTypeToURL: false,
  })

  const replay = createReplayExtension(AGENT_EVENT_CHANNEL, await getReplayId(org.org_id))
  cometd.registerExtension('replay', replay)

  try {
    await handshake(cometd)
  } catch (err) {
    cometd.disconnect()
    // Expired access token: refresh it once and try again
    if (!retried && isAuthError(err.reply)) {
      console.log(`[cometd] token expired for org ${org.org_id}, refreshing`)
      const refreshed = await refreshAccessToken(org)
      return startStreaming(refreshed, { retried: true })
    }
    throw new Error(`CometD handshake failed for org ${org.org_id}: ${err.message}`)
  }
  console.log(`[cometd] connected to org ${org.org_id} (replay from ${replay.replayId})`)

  // Token expired while streaming: CometD would keep retrying with the old token,
  // so refresh it and reconnect, resuming from the last replay id.
  let reconnecting = false
  cometd.addListener('/meta/connect', (message) => {
    if (message.successful || reconnecting || !isAuthError(message)) return
    reconnecting = true
    refreshAccessToken(org)
      .then((refreshed) => startStreaming(refreshed, { retried: true }))
      .catch((err) => console.error(`[cometd] reconnect failed for org ${org.org_id}:`, err.message))
  })

  cometd.subscribe(AGENT_EVENT_CHANNEL, async (message) => {
    const payload  = message.data?.payload
    const replayId = message.data?.event?.replayId
    if (!payload) return
    try {
      await bufferEvent(org.org_id, { ...payload, orgId: org.org_id, receivedAt: Date.now() })
      // Saved after buffering: a crash in between replays this event again, and the
      // database ignores the duplicate (at-least-once delivery)
      if (replayId != null) {
        replay.setReplayId(replayId)
        await setReplayId(org.org_id, replayId)
      }
    } catch (err) {
      console.error(`[cometd] could not buffer event for org ${org.org_id}:`, err.message)
    }
  }, (reply) => {
    if (!reply.successful) {
      console.error(`[cometd] subscribe failed for org ${org.org_id}:`, reply.error)
    }
  })

  activeStreams.set(org.org_id, cometd)
  return cometd
}

// Start streaming for all connected orgs on server boot
export async function startAllStreams() {
  const { rows: orgs } = await pool.query('SELECT * FROM orgs')
  for (const org of orgs) {
    try {
      await startStreaming(org)
    } catch (err) {
      console.error(`[cometd] failed to start stream for org ${org.org_id}:`, err.message)
    }
  }
}
