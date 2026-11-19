import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSalesforceId } from '../src/utils/salesforceId.js'

test('accepts 15- and 18-character ids', () => {
  assert.ok(isSalesforceId('0Mw5g000000XyZa'))
  assert.ok(isSalesforceId('0Mw5g000000XyZaAAK'))
})

test('rejects anything that could change the SOQL query', () => {
  assert.equal(isSalesforceId("x' OR Id != '"), false)
  assert.equal(isSalesforceId('0Mw5g000000XyZ'), false)
  assert.equal(isSalesforceId(''), false)
  assert.equal(isSalesforceId(undefined), false)
})
