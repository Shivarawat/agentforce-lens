import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEvent } from '../src/events/normalize.js'

test('reads custom Platform Event fields with the __c suffix', () => {
  const e = normalizeEvent({
    SessionId__c: 's-1', BotId__c: '0Xx1', ChannelType__c: 'Web', Status__c: 'Escalated',
    TurnCount__c: 4, IsEscalated__c: true, TurnSequenceNumber__c: 2,
    TopicName__c: 'Orders', ActionName__c: 'Get Order', IsActionSuccessful__c: false,
    ErrorMessage__c: 'timeout',
  }, 'org-1')

  assert.equal(e.orgId, 'org-1')
  assert.equal(e.sessionId, 's-1')
  assert.equal(e.status, 'escalated')
  assert.equal(e.turnCount, 4)
  assert.equal(e.escalated, true)
  assert.equal(e.turnIndex, 2)
  assert.equal(e.actionSuccess, false)
  assert.equal(e.errorMessage, 'timeout')
})

test('still accepts plain field names from older payloads', () => {
  const e = normalizeEvent({ SessionId: 's-2', TurnSequenceNumber: 1 }, 'org-1')
  assert.equal(e.sessionId, 's-2')
  assert.equal(e.turnIndex, 1)
})

test('applies defaults for missing values', () => {
  const e = normalizeEvent({ SessionId__c: 's-3' }, 'org-1')
  assert.equal(e.status, 'active')
  assert.equal(e.turnCount, 0)
  assert.equal(e.escalated, false)
  assert.equal(e.turnIndex, null)
})

test('returns null when the event cannot be stored', () => {
  assert.equal(normalizeEvent({ TopicName__c: 'no session' }, 'org-1'), null)
  assert.equal(normalizeEvent(null, 'org-1'), null)
})
