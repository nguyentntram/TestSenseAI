import './helpers/testEnv.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  requireString,
  optionalString,
  requireInteger,
  requireBoolean,
  parseJsonBody,
} from '../src/utils/validation.js'
import { ValidationError } from '../src/utils/errors.js'

test('requireString accepts a non-empty string and trims it', () => {
  assert.equal(requireString('  hello  ', 'name'), 'hello')
})

test('requireString rejects an empty string', () => {
  assert.throws(() => requireString('   ', 'name'), ValidationError)
})

test('requireString rejects a non-string', () => {
  assert.throws(() => requireString(42, 'name'), ValidationError)
})

test('requireString rejects a string over maxLength', () => {
  assert.throws(() => requireString('x'.repeat(10), 'name', { maxLength: 5 }), ValidationError)
})

test('optionalString allows undefined/null', () => {
  assert.equal(optionalString(undefined, 'bio'), undefined)
  assert.equal(optionalString(null, 'bio'), undefined)
})

test('optionalString rejects a non-string value', () => {
  assert.throws(() => optionalString(42, 'bio'), ValidationError)
})

test('requireInteger accepts an integer-like value', () => {
  assert.equal(requireInteger('42', 'count'), 42)
})

test('requireInteger rejects a non-integer', () => {
  assert.throws(() => requireInteger('abc', 'count'), ValidationError)
})

test('requireBoolean rejects a non-boolean', () => {
  assert.throws(() => requireBoolean('true', 'flag'), ValidationError)
})

test('parseJsonBody returns {} for empty body', () => {
  assert.deepEqual(parseJsonBody(null), {})
  assert.deepEqual(parseJsonBody(''), {})
})

test('parseJsonBody parses valid JSON', () => {
  assert.deepEqual(parseJsonBody('{"a":1}'), { a: 1 })
})

test('parseJsonBody rejects invalid JSON', () => {
  assert.throws(() => parseJsonBody('{not json'), ValidationError)
})
