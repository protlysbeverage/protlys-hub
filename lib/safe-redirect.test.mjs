import test from 'node:test';
import assert from 'node:assert/strict';
import { getSafeNext } from './safe-redirect.mjs';

test('allows same-origin paths and query strings', () => {
  assert.equal(getSafeNext('/dashboard?tab=stats#activity'), '/dashboard?tab=stats#activity');
});

test('defaults for missing or non-string values', () => {
  assert.equal(getSafeNext(null), '/');
  assert.equal(getSafeNext(''), '/');
  assert.equal(getSafeNext(42), '/');
});

test('rejects absolute and protocol-relative external URLs', () => {
  assert.equal(getSafeNext('https://evil.example/login'), '/');
  assert.equal(getSafeNext('//evil.example/login'), '/');
  assert.equal(getSafeNext('///evil.example/login'), '/');
});

test('rejects backslash-based redirect bypasses and non-http schemes', () => {
  assert.equal(getSafeNext('/\\\\evil.example/login'), '/');
  assert.equal(getSafeNext('javascript:alert(1)'), '/');
});
