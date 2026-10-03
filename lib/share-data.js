const TIME_ZONE = 'Africa/Nairobi';

export function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  return {
    year: Number(parts.find(p => p.type === 'year')?.value),
    month: Number(parts.find(p => p.type === 'month')?.value),
    day: Number(parts.find(p => p.type === 'day')?.value),
  };
}

export function localDateKey(date = new Date()) {
  const { year, month, day } = localDateParts(date);
  return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}

export function parseLocalDate(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

export function addLocalDays(key, delta) {
  const date = parseLocalDate(key);
  date.setUTCDate(date.getUTCDate() + Number(delta || 0));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

export function startOfLocalWeek(key = localDateKey()) {
  const date = parseLocalDate(key);
  return addLocalDays(key, -date.getUTCDay());
}

function rowsByDate(rows = []) {
  const map = new Map();
  for (const row of rows || []) {
    const key = row?.step_date || row?.key || row?.date;
    if (!key) continue;
    const steps = Math.max(0, Number(row?.steps || 0));
    map.set(key, (map.get(key) || 0) + steps);
  }
  return map;
}

export function buildDailySeries(rows = [], count = 7, endKey = localDateKey()) {
  const map = rowsByDate(rows);
  return Array.from({ length: count }, (_, index) => {
    const key = addLocalDays(endKey, index - count + 1);
    const steps = Number(map.get(key) || 0);
    return { key, steps, logged: steps > 0, isToday: key === endKey };
  });
}

export function buildHeatmap(rows = [], endKey = localDateKey()) {
  const map = rowsByDate(rows);
  const weekStart = startOfLocalWeek(endKey);
  const start = addLocalDays(weekStart, -28);

  return Array.from({ length: 35 }, (_, index) => {
    const key = addLocalDays(start, index);
    const { month, day } = localDateParts(parseLocalDate(key));
    const previousKey = index > 0 ? addLocalDays(key, -1) : null;
    const previousMonth = previousKey ? localDateParts(parseLocalDate(previousKey)).month : null;
    const steps = Number(map.get(key) || 0);
    const logged = steps > 0;

    return {
      key,
      day,
      month,
      monthLabel: new Intl.DateTimeFormat('en-KE', {
        timeZone: TIME_ZONE, month: 'short',
      }).format(parseLocalDate(key)),
      steps,
      logged,
      active: logged,
      today: key === endKey,
      isToday: key === endKey,
      future: key > endKey,
      monthChanged: index === 0 || month !== previousMonth,
      isFirstCell: index === 0,
    };
  });
}

function loggedKeys(rows = []) {
  return [...new Set((rows || [])
    .filter(row => Number(row?.steps || 0) > 0)
    .map(row => row?.step_date || row?.key || row?.date)
    .filter(Boolean))].sort();
}

export function getStreakRun(days = [], type = 'best') {
  const logged = days.filter(day => day.logged).map(day => day.key);
  if (!logged.length) return { keys: [], length: 0, start: null, end: null };

  const runs = [];
  let run = [logged[0]];
  for (let index = 1; index < logged.length; index += 1) {
    if (addLocalDays(logged[index - 1], 1) === logged[index]) run.push(logged[index]);
    else { runs.push(run); run = [logged[index]]; }
  }
  runs.push(run);

  let selected;
  if (type === 'current') {
    const today = days.find(day => day.today)?.key;
    const yesterday = addLocalDays(today || localDateKey(), -1);
    selected = runs.find(item => item.includes(today)) || runs.find(item => item.includes(yesterday)) || [];
  } else {
    selected = runs.reduce((best, item) => item.length > best.length ? item : best, []);
  }

  return {
    keys: selected,
    length: selected.length,
    start: selected[0] || null,
    end: selected[selected.length - 1] || null,
  };
}

export function bestStreakFromRows(rows = []) {
  const keys = loggedKeys(rows);
  if (!keys.length) return 0;
  let best = 1;
  let run = 1;
  for (let index = 1; index < keys.length; index += 1) {
    if (addLocalDays(keys[index - 1], 1) === keys[index]) run += 1;
    else run = 1;
    best = Math.max(best, run);
  }
  return best;
}

export const SHARE_METRIC_CONFIG = {
  steps_today: { unit: 'steps' },
  this_week: { unit: 'steps' },
  distance: { unit: 'km' },
  movement_days: { unit: 'days' },
  current_streak: { unit: 'days' },
  best_streak: { unit: 'days' },
  movement_calendar: { unit: 'days' },
  lifetime_steps: { unit: 'steps' },
  protein_today: { unit: 'g' },
  protein_target: { unit: 'g' },
};

function headlineFor(metric) {
  const map = {
    steps_today: ['STEPS', 'THIS WEEK'],
    distance: ['MOVED', 'THIS WEEK'],
    movement_days: ['ACTIVE', 'DAYS'],
    current_streak: ['CURRENT', 'STREAK'],
    best_streak: ['BEST', 'STREAK'],
    movement_calendar: ['MOVEMENT', 'CALENDAR'],
    lifetime_steps: ['TOTAL', 'STEPS'],
    protein_today: ['PROTEIN', 'TODAY'],
    protein_target: ['PROTEIN', 'TARGET'],
  };
  return map[metric] || ['PROGRESS', ''];
}

function dailyAverage(total, days) {
  return 'Daily average ' + (Number(total || 0) / Math.max(1, days)).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function rangeLabel(start, end) {
  if (!start || !end) return '';
  const formatter = new Intl.DateTimeFormat('en-KE', { timeZone: TIME_ZONE, day: 'numeric', month: 'short' });
  const a = formatter.format(parseLocalDate(start));
  const b = formatter.format(parseLocalDate(end));
  return a === b ? a : a + ' to ' + b;
}

export function getShareData(metric, {
  rows = [],
  todaySteps = 0,
  lifetimeSteps = 0,
  currentStreak = 0,
  bestStreak = 0,
  endKey = localDateKey(),
  periodPreference,
  proteinToday = 0,
  proteinTarget = 0,
  proteinProgress,
} = {}) {
  const map = rowsByDate(rows);
  const todayValue = Math.max(Number(todaySteps || 0), Number(map.get(endKey) || 0));
  const week = buildDailySeries(rows, 7, endKey).map(day =>
    day.key === endKey ? { ...day, steps: todayValue, logged: todayValue > 0 } : day
  );
  const heatmap = buildHeatmap(rows, endKey).map(day =>
    day.key === endKey ? { ...day, steps: todayValue, logged: todayValue > 0, active: todayValue > 0 } : day
  );

  const weekTotal = week.reduce((sum, day) => sum + day.steps, 0);
  const loggedDays = heatmap.filter(day => day.key <= endKey && day.logged).length;
  const lifetime = Math.max(
    Number(lifetimeSteps || 0),
    [...map.values()].reduce((sum, value) => sum + value, 0)
  );
  const lifetimeLoggedDays = [...map.values()].filter(value => value > 0).length;

  let number = 0;
  let unit = SHARE_METRIC_CONFIG[metric]?.unit || '';
  let label = '';
  let subtext = '';
  let visual = { type: 'summary' };
  let highlight = [];
  let progress = null;

  if (metric === 'steps_today' || metric === 'this_week') {
    number = weekTotal;
    label = 'steps this week';
    subtext = dailyAverage(weekTotal, 7);
    visual = { type: 'bars', days: week };
  } else if (metric === 'distance') {
    number = weekTotal * 0.00075;
    label = 'distance this week';
    subtext = dailyAverage(number, 7) + ' km';
    visual = { type: 'bars', days: week.map(day => ({ ...day, distance: day.steps * 0.00075 })) };
  } else if (metric === 'movement_days' || metric === 'movement_calendar') {
    number = loggedDays;
    label = 'movement days';
    subtext = number + ' ' + (number === 1 ? 'day' : 'days') + ' in the displayed range';
    visual = { type: 'heatmap', days: heatmap };
  } else if (metric === 'current_streak' || metric === 'best_streak') {
    const type = metric === 'current_streak' ? 'current' : 'best';
    const run = getStreakRun(heatmap, type);
    const fallback = type === 'current'
      ? Number(currentStreak || 0)
      : Math.max(Number(bestStreak || 0), bestStreakFromRows(rows));
    number = run.length || fallback;
    label = 'movement days in a row';
    subtext = run.length ? rangeLabel(run.start, run.end) : 'All recorded movement';
    highlight = run.keys;
    visual = { type: 'heatmap', days: heatmap, highlight: run.keys };
  } else if (metric === 'lifetime_steps') {
    number = lifetime;
    label = 'total movement';
    subtext = 'All recorded movement';
    visual = { type: 'summary' };
  } else if (metric === 'protein_today') {
    number = Number(proteinToday || 0);
    label = 'protein consumed today';
    subtext = proteinTarget ? number + ' g of ' + proteinTarget + ' g target' : 'Protein logged today';
    progress = proteinTarget ? number / proteinTarget : null;
    visual = { type: 'progress' };
  } else if (metric === 'protein_target') {
    number = Number(proteinTarget || 0);
    label = 'daily protein target';
    subtext = proteinToday ? number + ' g target · ' + proteinToday + ' g today' : 'Your daily protein target';
    progress = Number.isFinite(Number(proteinProgress)) ? Number(proteinProgress) : null;
    visual = { type: 'progress' };
  }

  const headline = headlineFor(metric);
  const hasData = number > 0 || heatmap.some(day => day.logged) || Number(progress) > 0;

  return {
    metric,
    headline,
    number,
    value: number,
    unit,
    label,
    subtext,
    progress,
    visual,
    heatmapDays: heatmap,
    weeklyDays: week,
    highlight,
    currentStreak: Number(currentStreak || 0),
    bestStreak: Math.max(Number(bestStreak || 0), bestStreakFromRows(rows)),
    hasData,
  };
}
