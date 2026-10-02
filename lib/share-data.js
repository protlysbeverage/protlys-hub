const TIME_ZONE = 'Africa/Nairobi';

export function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = type => parts.find(p => p.type === type)?.value || '';
  return get('year') + '-' + get('month') + '-' + get('day');
}

export function parseLocalDate(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addLocalDays(key, delta) {
  const d = parseLocalDate(key);
  d.setDate(d.getDate() + delta);
  return localDateKey(d);
}

function rowsByDate(rows = []) {
  return new Map((rows || []).map(row => [
    row?.step_date || row?.key || row?.date,
    Number(row?.steps || 0),
  ]).filter(([key]) => Boolean(key)));
}

export function buildDailySeries(rows = [], count = 7, endKey = localDateKey()) {
  const map = rowsByDate(rows);
  return Array.from({ length: count }, (_, index) => {
    const key = addLocalDays(endKey, index - count + 1);
    return { key, steps: Number(map.get(key) || 0), isToday: key === endKey };
  });
}

export function buildHeatmap(rows = [], count = 30, endKey = localDateKey()) {
  const map = rowsByDate(rows);
  return Array.from({ length: count }, (_, index) => {
    const key = addLocalDays(endKey, index - count + 1);
    const date = parseLocalDate(key);
    return {
      key,
      day: date.getDate(),
      month: date.getMonth(),
      monthLabel: date.toLocaleDateString('en-KE', { month: 'short' }),
      steps: Number(map.get(key) || 0),
      active: Number(map.get(key) || 0) > 0,
      today: key === endKey,
    };
  });
}

function bestStreakFromRows(rows = []) {
  const keys = [...new Set((rows || [])
    .filter(row => Number(row?.steps || 0) > 0)
    .map(row => row?.step_date || row?.key || row?.date)
    .filter(Boolean))].sort();

  let best = 0;
  let run = 0;
  let previous = null;
  for (const key of keys) {
    if (previous && addLocalDays(previous, 1) === key) run += 1;
    else run = 1;
    best = Math.max(best, run);
    previous = key;
  }
  return best;
}

export const SHARE_METRIC_CONFIG = {
  steps_today: { unit: 'steps', label: 'steps this week', headline: ['STEPS', 'THIS WEEK'] },
  distance: { unit: 'km', label: 'distance this week', headline: ['MOVED', 'THIS WEEK'] },
  movement_days: { unit: 'days', label: 'active days', headline: ['ACTIVE', 'DAYS'] },
  lifetime_steps: { unit: 'steps', label: 'total movement', headline: ['TOTAL', 'STEPS'] },
  best_streak: { unit: 'days', label: 'movement days in a row', headline: ['BEST', 'STREAK'] },
};

export function getShareData(metric, {
  rows = [],
  todaySteps = 0,
  lifetimeSteps = 0,
  currentStreak = 0,
  bestStreak = 0,
  endKey = localDateKey(),
} = {}) {
  const config = SHARE_METRIC_CONFIG[metric] || SHARE_METRIC_CONFIG.steps_today;
  const week = buildDailySeries(rows, 7, endKey);
  const last30 = buildDailySeries(rows, 30, endKey);
  const weekTotal = week.reduce((sum, row) => sum + row.steps, 0);
  const last30Total = last30.reduce((sum, row) => sum + row.steps, 0);
  const lifetime = Math.max(Number(lifetimeSteps) || 0, rows.reduce((sum, row) => sum + Number(row?.steps || 0), 0));
  const hasToday = Number(todaySteps || 0) > 0;
  const hasWeek = weekTotal > 0;
  const has30 = last30Total > 0;
  const hasLifetime = lifetime > 0;
  const hasMovement = hasToday || hasWeek || has30 || hasLifetime;

  if (metric === 'steps_today') {
    const period = hasToday ? 'This week' : hasWeek ? 'This week' : has30 ? 'Last 30 days' : 'All time';
    const total = hasToday || hasWeek ? weekTotal : has30 ? last30Total : lifetime;
    const bars = hasToday || hasWeek ? week : has30 ? buildDailySeries(rows, 7, endKey) : week;
    return {
      metric, ...config, value: total, unit: 'steps', label: config.label,
      subtext: bars.length ? 'Daily average ' + Math.round(total / (period === 'This week' ? 7 : Math.min(30, Math.max(1, (period === 'Last 30 days' ? 30 : 1))))).toLocaleString() + ' steps' : '',
      period, weeklyDays: bars, heatmapDays: last30, hasData: hasMovement,
    };
  }

  if (metric === 'distance') {
    const total = hasWeek ? weekTotal * 0.00075 : has30 ? last30Total * 0.00075 : lifetime * 0.00075;
    const period = hasWeek ? 'This week' : has30 ? 'Last 30 days' : 'All time';
    const distanceDays = week.map(row => ({ ...row, distance: row.steps * 0.00075 }));
    return {
      metric, ...config, value: total, unit: 'km', label: config.label,
      subtext: 'Daily average ' + (total / (period === 'This week' ? 7 : period === 'Last 30 days' ? 30 : 1)).toFixed(1) + ' km',
      period, weeklyDays: distanceDays, heatmapDays: last30, hasData: hasMovement,
    };
  }

  if (metric === 'movement_days') {
    const activeDays = week.filter(row => row.steps > 0).length;
    const best = Number(bestStreak) || bestStreakFromRows(rows);
    return {
      metric, ...config, value: activeDays, unit: 'days',
      label: 'active days', subtext: activeDays + ' ' + (activeDays === 1 ? 'day' : 'days') + ' this week',
      period: 'This week', weeklyDays: week, heatmapDays: last30, bestStreak: best,
      hasData: hasMovement,
    };
  }

  if (metric === 'lifetime_steps') {
    return {
      metric, ...config, value: lifetime, unit: 'steps',
      label: 'total movement', subtext: 'All recorded movement',
      period: 'All time', weeklyDays: week, heatmapDays: last30, hasData: hasMovement,
    };
  }

  const best = Number(bestStreak) || bestStreakFromRows(rows);
  const current = Number(currentStreak) || 0;
  return {
    metric, ...config, value: best, unit: 'days',
    label: 'movement days in a row', subtext: 'Best streak ' + best + ' days',
    period: 'All time', weeklyDays: week, heatmapDays: last30, currentStreak: current,
    bestStreak: best, hasData: hasMovement,
  };
}
