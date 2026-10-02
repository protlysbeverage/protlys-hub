import test from 'node:test';
import assert from 'node:assert/strict';
import { monthIndex, shiftMonth, canGoPrevious, canGoNext } from './movement-calendar.js';

test('calendar moves Oct -> Sep -> Aug -> Sep -> Oct without mutating dates', () => {
  const oct = new Date(2026, 9, 1);
  const sep = shiftMonth(oct, -1);
  const aug = shiftMonth(sep, -1);
  const sepAgain = shiftMonth(aug, 1);
  const octAgain = shiftMonth(sepAgain, 1);

  assert.equal(oct.getMonth(), 9);
  assert.equal(sep.getMonth(), 8);
  assert.equal(aug.getMonth(), 7);
  assert.equal(sepAgain.getMonth(), 8);
  assert.equal(octAgain.getMonth(), 9);
  assert.equal(monthIndex(octAgain), monthIndex(oct));
});

test('calendar crosses the year boundary in both directions', () => {
  const jan = new Date(2027, 0, 1);
  const dec = shiftMonth(jan, -1);
  const nov = shiftMonth(dec, -1);
  const decAgain = shiftMonth(nov, 1);
  const janAgain = shiftMonth(decAgain, 1);

  assert.equal(dec.getFullYear(), 2026);
  assert.equal(dec.getMonth(), 11);
  assert.equal(nov.getMonth(), 10);
  assert.equal(decAgain.getMonth(), 11);
  assert.equal(janAgain.getFullYear(), 2027);
  assert.equal(janAgain.getMonth(), 0);
});

test('next is allowed through the current month and previous stops before first log', () => {
  const firstLog = new Date(2026, 7, 12);
  const current = new Date(2026, 9, 3);
  assert.equal(canGoNext(new Date(2026, 8, 1), current), true);
  assert.equal(canGoNext(new Date(2026, 9, 1), current), false);
  assert.equal(canGoPrevious(new Date(2026, 8, 1), firstLog), true);
  assert.equal(canGoPrevious(new Date(2026, 7, 1), firstLog), false);
});
