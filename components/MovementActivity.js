'use client';

import ShareCardSheet from '@/components/ShareCardSheet';
import { ShareIconButton } from '@/components/ShareIcon';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getShareData } from '@/lib/share-data';
import { monthIndex, shiftMonth, canGoPrevious, canGoNext as canGoNextMonth } from '@/lib/movement-calendar';

function dateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function dayDiff(a, b) {
  return Math.round((parseKey(a) - parseKey(b)) / 86400000);
}

function streaks(keys) {
  const sorted = [...new Set(keys)].sort();
  if (!sorted.length) return { current: 0, best: 0 };
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (dayDiff(sorted[i], sorted[i - 1]) === 1) run += 1;
    else run = 1;
    best = Math.max(best, run);
  }
  const todayKey = dateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  const endKey = sorted[sorted.length - 1];
  if (endKey !== todayKey && endKey !== yesterdayKey) return { curre¶»§q«^