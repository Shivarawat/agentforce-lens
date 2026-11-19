import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flushOrg } from '../src/events/flush.js'

// In-memory stand-in for the Redis buffer
function fakeStore(events) {
  const buffer = [...events]
  return {
    buffer,
    peekEvents: async (_orgId, max) => buffer.slice(0, max),
    ackEvents: async (_orgId, count) => { buffer.splice(0, count) },
  }
}

// Stand-in for pg's Pool: records every query; optionally fails on a matching SQL
function fakePool({ failOn } = {}) {
  const queries = []
  let released = 0
  const client = {
    query: async (sql, params) => {
      queries.push({ sql: sql.trim(), params })
      if (failOn && sql.includes(failOn)) throw new Error('db down')
    },
    release: () => { released++ },
  }
  return {
    queries,
    get released() { return released },
    connect: async () => client,
  }
}

const turn = (sessionId, turnIndex) => ({ SessionId__c: sessionId, TurnSequenceNumber__c: turnIndex })

test('writes a batch in one transaction and removes it from the buffer after COMMIT', async () => {
  const store = fakeStore([turn('s-1', 1), turn('s-1', 2)])
  const pool = fakePool()

  const result = await flushOrg('org-1', { store, pool })

  assert.deepEqual(result, { written: 2, skipped: 0 })
  const statements = pool.queries.map((q) => q.sql.split(/\s+/)[0])
  assert.deepEqual(statements, ['BEGIN', 'INSERT', 'INSERT', 'INSERT', 'INSERT', 'COMMIT'])
  assert.equal(store.buffer.length, 0)
  assert.equal(pool.released, 1)
})

test('keeps events buffered when the database write fails', async () => {
  const store = fakeStore([turn('s-1', 1)])
  const pool = fakePool({ failOn: 'conversation_turns' })

  await assert.rejects(flushOrg('org-1', { store, pool }), /db down/)

  assert.equal(store.buffer.length, 1, 'event must not be lost')
  assert.ok(pool.queries.some((q) => q.sql === 'ROLLBACK'))
  assert.equal(pool.released, 1, 'connection is always returned to the pool')
})

test('drops events without a session id instead of retrying them forever', async () => {
  const store = fakeStore([{ TopicName__c: 'broken' }, turn('s-1', 1)])
  const pool = fakePool()

  const result = await flushOrg('org-1', { store, pool })

  assert.deepEqual(result, { written: 1, skipped: 1 })
  assert.equal(store.buffer.length, 0)
})

test('only takes one batch at a time and leaves the rest for the next tick', async () => {
  const store = fakeStore([turn('s-1', 1), turn('s-1', 2), turn('s-1', 3)])
  const pool = fakePool()

  await flushOrg('org-1', { store, pool, batchSize: 2 })

  assert.equal(store.buffer.length, 1)
  assert.equal(store.buffer[0].TurnSequenceNumber__c, 3)
})

test('conversation-level events without a turn number skip the turn insert', async () => {
  const store = fakeStore([{ SessionId__c: 's-1', Status__c: 'Resolved' }])
  const pool = fakePool()

  await flushOrg('org-1', { store, pool })

  assert.ok(!pool.queries.some((q) => q.sql.includes('conversation_turns')))
})

test('does nothing when the buffer is empty', async () => {
  const pool = fakePool()
  const result = await flushOrg('org-1', { store: fakeStore([]), pool })
  assert.deepEqual(result, { written: 0, skipped: 0 })
  assert.equal(pool.queries.length, 0)
})
