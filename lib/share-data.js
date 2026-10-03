const TIME_ZONE = 'Africa/Nairobi';

export function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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
  const d = parseLocalDate(key);
  d.setUTCDate(d.getUTCDate() + Number(delta || 0));
  return localDateKey(d);
}

function rowsByDate(rows = []) {
  const map = new Map();
  for (const row of rows || []) {
    const key = row?.step_date || row?.key || row?.date;
    if (!key) continue;
    const steps = Number(row?.steps || 0);
    map.set(key, (map.get(key) || 0) + Math.max(0, steps));
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

export function buildHeatmap(rows = [], count = 35, endKey = localDateKey()) {
  const map = rowsByDate(rows);
  const start = addLocalDays(startOfLocalWeek(endKey), -28);
  return Array.from({ length: 35 }, (_, index) => {
    const key = addLocalDays(start, index);
    const { month, day } = localDateParts(parseLocalDate(key));
    const previousKey = index > 0 ? addLocalDays(start, index - 1) : null;
    const previousMonth = previousKey ? localDateParts(parseLocalDate(previousKey)).month : null;
    const steps = Number(map.get(key) || 0);
    const logged = steps > 0;
    return {
      key, day, month,
      monthLabel: new Intl.DateTimeFormat('en-KE', { timeZone: TIME_ZONE, month: 'short' }).format(parseLocalDate(key)),
      steps, logged, active: logged, today: key === endKey, isToday: key === endKey,
      future: key > endKey, monthChanged: index === 0 || month !== previousMonth, isFirstCell: index === 0,
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
  for (let i = 1; i < logged.length; i += 1) {
    if (addLocalDays(logged[i - 1], 1) === logged[i]) run.push(logged[i]);
    else { runs.push(run); run = [logged[i]]; }
  }
  runs.push(run);

  let selected;
  if (type === 'current') {
    const today = days.find(day => day.today)?.key || days[days.length - 1]?.key;
    const yesterday = addLocalDays(today || localDateKey(), -1);
    selected = runs.find(run => run.includes(today)) || runs.find(run => run.includes(yesterday)) || [];
  } else {
    selected = runs.reduce((best, candidate) => candidate.length > best.length ? candidate : best, []);
  }

  return {
    keys: selected,
    length: selected.length,
    start: selected[0] || null,
    end: selected[selected.length - 1] || null,
  };
}

export function startOfLocalWeek(key = localDateKey()) {
  const d = parseLocalDate(key);
  return addLocalDays(key, -d.getUTCDay());
}

export function bestStreakFromRows(rows = []) {
  const keys = loggedKeys(rows);
  if (!keys.length) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i += 1) {
    if (addLocalDays(keys[i - 1], 1) === keys[i]) run += 1;
    else run = 1;
    best = Math.max(best, run);
  }
  return best;
}

export const SHARE_METRIC_CONFIG = {
  steps_today: { unit: 'steps' },
  distance: { unit: 'km' },
  movement_days: { unit: 'days' },
  movement_calendar: { unit: 'days' },
  lifetime_steps: { unit: 'steps' },
  current_streak: { unit: 'days' },
  best_streak: { unit: 'days' },
};

function periodCopy(metric, period) {
  const map = {
    steps_today: {
      'This week': ['STEPS', 'THIS WEEK', 'steps this week'],
      'Last 30 days': ['STEPS', 'LAST 30 DAYS', 'steps in the last 30 days'],
      'All time': ['STEPS', 'ALL TIME', 'total steps'],
    },
    distance: {
      'This week': ['MOVED', 'THIS WEEK', 'distance this week'],
      'Last 30 days': ['MOVED', 'LAST 30 DAYS', 'distance in the last 30 days'],
      'All time': ['MOVED', 'ALL TIME', 'total distance'],
    },
    movement_days: {
      'This week': ['ACTIVE', 'DAYS', 'active days this week'],
      'Last 30 days': ['ACTIVE', 'LAST 30 DAYS', 'active days in the last 30 days'],
      'All time': ['ACTIVE', 'DAYS', 'active days all time'],
    },
    movement_calendar: {
      'Last 30 days': ['MOVEMENT', 'CALENDAR', 'movement days in the last 30 days'],
      'All time': ['MOVEMENT', 'CALENDAR', 'movement days'],
    },
    lifetime_steps: {
      'All time': ['TOTAL', 'STEPS', 'total movement'],
    },
    current_streak: {
      'Last 30 days': ['CURRENT', 'STREAK', 'movement days in a row'],
      'All time': ['CURRENT', 'STREAK', 'movement days in a row'],
    },
    best_streak: {
      'Last 30 days': ['BEST', 'STREAK', 'movement days in a row'],
      'All time': ['BEST', 'STREAK', 'movement days in a row'],
    },
  };
  return map[metric]?.[period] || ['PROGRESS', '', metric];
}

function dailyAverage(total, days) {
  return 'Daily average ' + (Number(total || 0) / Math.max(1, days)).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

export function getShareData(metric, {
  rows = [],
  todaySteps = 0,
  lifetimeSteps = 0,
  currentStreak = 0,
  bestStreak = 0,
  endKey = localDateKey(),
  streakType,
  periodPreference,
} = {}) {
  const map = rowsByDate(rows);
  const todayValue = Math.max(Number(todaySteps || 0), Number(map.get(endKey) || 0));
  const week = buildDailySeries(rows, 7, endKey).map(day =>
    day.key === endKey ? { ...day, steps: todayValue, logged: todayValue > 0 } : day
  );
  const last35 = buildHeatmap(rows, 35, endKey).map(day =>
    day.key === endKey ? { ...day, steps: todayValue, logged: todayValue > 0, active: todayValue > 0 } : day
  );
  const weekTotal = week.reduce((sum, day) => sum + day.steps, 0);
  const displayedDays = last35.filter(day => day.key <= endKey);
  const last35Total = displayedDays.reduce((sum, day) => sum + day.steps, 0);
  const lifetime = Math.max(Number(lifetimeSteps || 0), [...map.values()].reduce((sum, value) => sum + value, 0));
  const lifetimeLoggedDays = [...map.values()].filter(value => value > 0).length;

  let period = 'All time';
  let number = 0;
  let unit = SHARE_METRIC_CONFIG[metric]?.unit || '';
  let label = '';
  let subtext = '';
  let visual = { type: 'summary' };
  let highlight = [];

  if (metric === 'steps_today') {
    if (todayValue > 0 || weekTotal > 0) {
      period = 'This week';
      number = weekTotal;
      label = 'steps this week';
      subtext = dailyAverage(weekTotal, 7);
      visual = { type: 'bars', days: week };
    } else if (last30Total > 0) {
      period = 'Last 30 days';
      number = last30Total;
      label = 'steps in the last 30 days';
      subtext = dailyAverage(last30Total, 30);
      visual = { type: 'heatmap', days: last35 };
    } else if (lifetime > 0) {
      number = lifetime;
      label = 'total steps';
      subtext = 'All recorded movement';
      visual = { type: 'summary' };
    }
  } else if (metric === 'distance') {
    const weekDistance = weekTotal * 0.00075;
    const monthDistance = last35Total * 0.00075;
    const lifetimeDistance = lifetime * 0.00075;
    if (weekTotal > 0) {
      period = 'This week'; number = weekDistance; label = 'distance this week';
      subtext = dailyAverage(weekDistance, 7) + ' km';
      visual = { type: 'bars', days: week.map(day => ({ ...day, distance: day.steps * 0.00075 })) };
    } else if (last30Total > 0) {
      period = 'Last 30 days'; number = monthDistance; label = 'distance in the last 30 days';
      subtext = dailyAverage(monthDistance, 30) + ' km';
      visual = { type: 'heatmap', days: last30 };
    } else if (lifetimeDistance > 0) {
      number = lifetimeDistance; label = 'total distance'; subtext = 'All recorded movement'; visual = { type: 'summary' };
    }
  } else if (metric === 'movement_calendar') {
    const monthDays = displayedDays.filter(day => day.logged).length;
    number = monthDays;
    label = 'movement days';
    subtext = monthDays + ' ' + (monthDays === 1 ? 'day' : 'days') + ' in the last 30 days';
    visual = { type: 'heatmap', days: last30 };
  } else if (metric === 'movement_days') {
    const weekDays = week.filter(day => day.logged).length;
    const monthDays = last30.filter(day => day.logged).length;
    if (periodPreference === 'Last 30 days' && monthDays > 0) {
      period = 'Last 30 days'; number = monthDays; label = 'active days'; subtext = monthDays + ' ' + (monthDays === 1 ? 'day' : 'days') + ' in the last 30 days';
      visual = { type: 'heatmap', days: last30 };
    } else if (weekDays > 0) {
      period = 'This week'; number = weekDays; label = 'active days'; subtext = weekDays + ' ' + (weekDays === 1 ? 'day' : 'days') + ' this week';
      visual = { type: 'bars', days: week, mode: 'logged' };
    } else if (monthDays > 0) {
      period = 'Last 30 days'; number = monthDays; label = 'active days'; subtext = monthDays + ' ' + (monthDays === 1 ? 'day' : 'days') + ' in the last 30 days';
      visual = { type: 'heatmap', days: last30 };
    } else if (lifetimeLoggedDays > 0) {
      number = lifetimeLoggedDays; label = 'active days'; subtext = 'All recorded movement'; visual = { type: 'summary' };
    }
  } else if (metric === 'lifetime_steps') {
    if (lifetime > 0) {
      number = lifetime; label = 'total movement'; subtext = 'All recorded movement'; visual = { type: 'summary' };
    }
  } else if (metric === 'current_streak' || metric === 'best_streak') {
    const type = metric === 'current_streak' || streakType === 'current' ? 'current' : 'best';
    const run = getStreakRun(last35, type);
    const fallbackValue = type === 'current' ? Number(currentStreak || 0) : Math.max(Number(bestStreak || 0), bestStreakFromRows(rows));
    const streakValue = run.length || fallbackValue;
    if (streakValue > 0) {
      period = run.length ? 'Last 30 days' : 'All time';
      number = streakValue;
      label = 'movement days in a row';
      if (run.length) {
        const start = run.start;
        const end = run.end;
        const startDay = Number(start.slice(8));
        const endDay = Number(end.slice(8));
        const startMonth = new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', month: 'short' }).format(parseLocalDate(start));
        const endMonth = new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', month: 'short' }).format(parseLocalDate(end));
        subtext = start === end ? `${startDay} ${endMonth}` : (startMonth === endMonth ? `${startDay} to ${endDay} ${endMonth}` : `${startDay} ${startMonth} to ${endDay} ${endMonth}`);
      } else subtext = 'All recorded movement';
      visual = { type: 'heatmap', days: last35, highlight: run.keys };
      highlight = run.keys;
    }
  }

  const [headline0, headline1, defaultLabel] = periodCopy(metric, period);
  if (!label) label = defaultLabel;
  const hasData = number > 0 || (visual.type === 'heatmap' && visual.days?.some(day => day.logged));

  return {
    metric,
    headline: [headline0, headline1],
    number,
    value: number,
    unit,
    label,
    subtext,
    period,
    visual,
    heatmapDays: last35,
    weeklyDays: week,
    highlight,
    currentStreak: Number(currentStreak || 0),
    bestStreak: Math.max(Number(bestStreak || 0), bestStreakFromRows(rows)),
    hasData,
  };
}
