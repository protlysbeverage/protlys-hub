'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import MemberShareSheet from '@/components/MemberShareSheet';
import { ProtlysLoader } from '@/app/calculator/ProtlysLoader';

function Icon({ name, size = 19 }) {
  const paths = {
    steps: <><path d="M8.5 4.5c1.4 2 1.8 4.2.8 6.2-.8 1.7-2.5 2.7-4.1 2.5-1.6-.2-2.5-1.7-1.9-3.1.6-1.4 2-2 3.3-2.7 1.1-.5 1.5-1.4 1.9-2.9Z"/><path d="M15.5 19.5c-1.4-2-1.8-4.2-.8-6.2.8-1.7 2.5-2.7 4.1-2.5 1.6.2 2.5 1.7 1.9 3.1-.6 1.4-2 2-3.3 2.7-1.1.5-1.5 1.4-1.9 2.9Z"/></>,
    challenge: <><path d="M8 4h8l-1 6a3 3 0 0 1-6 0L8 4Z"/><path d="M12 13v5M8 21h8M5 4h3M16 4h3"/></>,
    community: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c.5-3.2 2.5-5 6-5s5.5 1.8 6 5M14.5 15.5c2.5-.2 4.5 1.3 5 3.5"/></>,
    profile: <><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.6-3.6 2.9-5.5 7-5.5s6.4 1.9 7 5.5"/></>,
    leaderboard: <><path d="M4 19V9h4v10M10 19V5h4v14M16 19v-7h4v7"/><path d="M3 21h18"/></>,
    share: <><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.8-4.6M8 13l7.8 4.6"/></>,
    box: <><path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="M4 8v9l8 4 8-4V8M12 12v9"/></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v11H4V7Z"/><circle cx="12" cy="12.5" r="3.2"/></>,
    chevronDown: <path d="m6 9 6 6 6-6"/>,
  };
  return <svg viewBox=¶»§q«^