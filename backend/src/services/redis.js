import { createClient } from 'redis'

const client = createClient({ url: process.env.REDIS_URL })

client.on('error', (err) => console.error('[redis] error', err))

export async function connectRedis() {
  await client.connect()
  console.log('[redis] connected')
}

// Buffer an incoming Platform Event payload before flushing to PG
export async function bufferEvent(orgId, payload) {
  const key = `events:${orgId}`
  await client.rPush(key, JSON.stringify(payload))
}

// Drain all buffered events for an org
export async function drainEvents(orgId) {
  const key = `events:${orgId}`
  const items = await client.lRange(key, 0, -1)
  if (items.length > 0) await client.del(key)
  return items.map(i => JSON.parse(i))
}

export default client
