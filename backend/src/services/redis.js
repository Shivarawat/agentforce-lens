import { createClient } from 'redis'

const client = createClient({ url: process.env.REDIS_URL })

client.on('error', (err) => console.error('[redis] error', err))

export async function connectRedis() {
  await client.connect()
  console.log('[redis] connected')
}

const eventsKey = (orgId) => `events:${orgId}`
const replayKey = (orgId) => `replay:${orgId}`

// Buffer an incoming Platform Event payload before flushing to PG
export async function bufferEvent(orgId, payload) {
  await client.rPush(eventsKey(orgId), JSON.stringify(payload))
}

// Read up to `max` buffered events WITHOUT removing them. They are only removed by
// ackEvents() after Postgres has committed them, so a failed write loses nothing.
export async function peekEvents(orgId, max) {
  const items = await client.lRange(eventsKey(orgId), 0, max - 1)
  return items.map((i) => JSON.parse(i))
}

// Remove the first `count` events (the ones just written). New events that arrived
// during the write are at the end of the list and are kept.
export async function ackEvents(orgId, count) {
  if (count > 0) await client.lTrim(eventsKey(orgId), count, -1)
}

// Last Platform Event replay id seen for an org, so streaming can resume after a restart
export async function getReplayId(orgId) {
  const value = await client.get(replayKey(orgId))
  return value == null ? null : Number(value)
}

export async function setReplayId(orgId, replayId) {
  await client.set(replayKey(orgId), String(replayId))
}

export default client
