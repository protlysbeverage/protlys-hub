import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getShareData,
  buildHeatmap,
  localDateKey,
} from './share-data.js';

const fixture = [
  { step_date: '2026-09-28', steps: 3000 },
  { step_date: '2026-09-29', steps: 0 },
  { step_date: '2026-09-30', steps: 4500 },
  { step_date: '2026-10-01', steps: 5000 },
  { step_date: '2026-10-02', steps: 5818 },
  { step_date: '2026-10-03', steps: 0 },
];

const context = {
  rows: fixture,
  todaySteps: 0,
  lifetimeSteps: 18318,
  currentStreak: 0,
  bestStreak: 13,
  endKey: '2026-10-03',
};

test('same fixture drives tile and share-card data', () => {
  for (const metric of ['steps_today', 'distance', 'movement_days', 'lifetime_steps']) {
    const tile = getShareData(metric, context);
    const card = getShareData(metric, context);
    assert.deepEqual(card.visual, tile.visual);
    assert.equal(card.number, tile.number);
    assert.equal(card.unit, tile.unit);
    assert.equal(card.period, tile.period);
  }
});

test('movement days count equals logged cells drawn', () => {
  const data = getShareData('movement_days', context);
  assert.equal(data.number, data.visual.days.filter(day => day.logged).length);
});

test('streak cards use the same 35-day heatmap and highlight the run', () => {
  for (const metric of ['current_streak', 'best_streak']) {
    const data = getShareData(metric, context);
    assert.equal(data.visual.type, 'heatmap');
    assert.equal(data.visual.days.length, 35);
    assert.equal(data.visual.highlight.length, data.number);
    for (const key of data.visual.highlight) {
      assert.ok(data.visual.days.some(day => day.key === key && day.logged));
    }
  }
});

test('heatmap always contains 35 local dates and uses logged booleans', () => {
  const days = buildHeatmap(fixture, '2026-10-03');
  assert.equal(days.length, 35);
  assert.ok(days.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day.key)));
  assert.equal(days.filter(day => day.logged).length, 4);
  assert.equal(days.at(-1).key, '2026-10-03');
});

test('local date key is based on Africa/Nairobi date parts', () => {
  const justAfterMidnightUtc = new Date('2026-10-02T21:30:00.000Z');
  assert.equal(localDateKey(justAfterMidnightUtc), '2026-10-03');
});
