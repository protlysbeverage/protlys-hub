'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MovementActivity from '@/components/MovementActivity';
import ShareCardSheet from '@/components/ShareCardSheet';
import { ShareIconButton } from '@/components/ShareIcon';
import { getShareData } from '@/lib/share-data';
import AndroidStepTrackingCard from '@/components/AndroidStepTrackingCard';

function localDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}
function caloriesForSteps(steps) { return Math.round(Number(steps || 0) * 0.04); }
function distanceForSteps(steps) { return Number(steps || 0) * 0.00075; }

function AnimatedNumber({ value, formatter = n => Math.round(n).toLocaleString() }) {
  const target = Number(value || 0);
  const [display, setDisplay] = useState(target);
  const previous = useRef(target);

  useEffect(() => {
    const from = Number(previous.current || 0);
    if (from === target) return;
    previous.current = target;
    const start = performance.now();
    let frame = 0;
    const tick = now => {
      const progress = Math.min(1, (now - start) / 400);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targ¶»§q«^