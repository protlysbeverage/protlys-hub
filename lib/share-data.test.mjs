import test from 'node:test';
import assert from 'node:assert/strict';
import { getShareData } from './share-data.js';

const fixture = [
  { step_date: '2026-09-28', steps: 3000 },
  { step_date: '2026-09-29', steps: 0 },
  { step_date: '2026-09-30', steps: 4500 },
  { step_date: '2026-10-01', steps: 5000 },
  { step_date: '2026-10-02', steps: 5818 },
  { step_date: '2026-10-03', steps: 0 },
];

test('the same movement fixture produces identical tile and share-card values', () => {
  const context = { rows: fixture, todaySteps: 0, lifetimeSteps: 18318, bestStreak: 13, endKey: '2026-10-03' };
  const tile = getShareData('steps_today', context);
  const card = getShareData('steps_today', context);
  assert.equal(tile.value, 18318);
  assert.equal(card.value, tile.value);
  assert.equal(card.unit, 'steps');

  const activeTile = getShareData('movement_days', context);
  const activeCard = getShareData('movement_days', context);
  assert.equal(activeTile.value, 4);
  assert.equal(activeCard.value, activeTile.value);
  assert.equal(activeCard.unit, 'days');
  assert.equal(activeCard.subtext, '4 days this week');
  assert.equal(activeCard.bestStreak, 13);
});
