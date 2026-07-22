import { CometD } from 'cometd'
import { adapt } from 'cometd-nodejs-client'
import { bufferEvent } from '../services/redis.js'
import pool from '../db/pool.js'

const AGENT_EVENT_CHANNEL = '/event/AgentConversationEvent__e'

// Start a CometD streaming listener for a specific org
export async function startStreaming(org) {
  adapt()
  const cometd = new CometD()

  cometd.configure({
    url:            `${org.instance_url}/cometd/59.0`,
    requestHeaders: { Authorization: `Bearer ${org.access_token}` },
    appendMessageTypeToURL: false,
  })

  await new Promise((resolve, reject) => {
    cometd.handshake((reply) => {
      if (reply.successful) {
        console.log(`[cometd] connected to org ${org.org_id}`)
        resolve()
      } else {
        reject(new Error(`CometD handshake failed for org ${org.org_id}`))
      }
    })
  })

  cometd.subscribe(AGENT_EVENT_CHANNEL, async (message) => {
    const payload = message.data?.payload
    if (!payload) return
    await bufferEvent(org.org_id, { ...payload, orgId: org.org_id, receivedAt: Date.now() })
  })

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
