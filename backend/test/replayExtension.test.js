import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createReplayExtension } from '../src/events/replayExtension.js'

const CHANNEL = '/event/AgentConversationEvent__e'

test('asks only for new events when no replay id is stored', () => {
  const ext = createReplayExtension(CHANNEL, null)
  const msg = ext.outgoing({ channel: '/meta/subscribe', subscription: CHANNEL })
  assert.deepEqual(msg.ext.replay, { [CHANNEL]: -1 })
})

test('resumes from the last stored replay id', () => {
  const ext = createReplayExtension(CHANNEL, 42)
  ext.setReplayId(57)
  const msg = ext.outgoing({ channel: '/meta/subscribe', subscription: CHANNEL, ext: { other: 1 } })
  assert.deepEqual(msg.ext, { other: 1, replay: { [CHANNEL]: 57 } })
})

test('leaves other messages untouched', () => {
  const ext = createReplayExtension(CHANNEL, 42)
  const connect = ext.outgoing({ channel: '/meta/connect' })
  const otherSub = ext.outgoing({ channel: '/meta/subscribe', subscription: '/event/Other__e' })
  assert.equal(connect.ext, undefined)
  assert.equal(otherSub.ext, undefined)
})
