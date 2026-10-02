import test from 'node:test';
import assert from 'node:assert/strict';
import { getShareData } from '../lib/share-data.js';

const fixture = [
  { step_date: '2026-09-27', steps: 1200 },
  { step_date: '2026-09-28', steps: 3000 },
  { step_date: '2026-09-29', steps: 0 },
  { step_date: '2026-09-30', steps: 4500 },
  { step_date: '2026-10-01', steps: 5000 },
  { step_date: '2026-10-02', steps: 5818 },
  { step_date: '2026-10-03', steps: 0 },
];

test('share selector gives the same steps and active-day numbers to every consumer', () => {
  const tile = getShareData('steps_today', { rows: fixture, todaySteps: 0, lifetimeSteps: 19518, endKey: '2026-10-03' });
  const card = getShareData('steps_today', { rows: fixture, todaySteps: 0, lifetimeSteps: 19518, endKey: '2026-10-03' });
  assert.equal(tile.value, 19518);
  assert.equal(card.value, tile.value);
  assert.equal(card.unit, 'steps');

  const activeTile = getShareData('movement_days', { rows: fixture, lifetimeSteps: 19518, bestStreak: 13, endKey: '2026-10-03' });
  const activeCard = getShareData('movement_days', { rows: fixture, lifetimeSteps: 19518, bestStreak: 13, endKey: '2026-10-03' });
  assert.equal(activeTile.value, 5);
  assert.equal(activeCard.value, activeTile.value);
  assert.equal(activeCard.unit, 'days');
  assert.equal(activeCard.subtext, '5 days this week');
  assert.equal(activeCard.bestStreak, 13);
});
