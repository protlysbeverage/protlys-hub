'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setActivityLevelAction } from '@/app/movement-actions';
import MovementClient from './MovementClient';

const ACTIVITY_OPTIONS = [
  { value: 'low', label: 'Low', desc: 'Mostly sitting and light walks', goal: '3,000 steps/day to start' },
  { value: 'moderate', label: 'Moderate', desc: 'Active a few days each week', goal: '5,000 steps/day to start' },
  { value: 'high', label: 'High', desc: 'Daily exercise or sport', goal: '7,500 steps/day to start' },
];

function PhoneIcon({ type }) {
  if (type === 'apple') return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M10 6h4M11 18h2" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 7h6M9 17h6" />
    </svg>
  );
}

function removeLegacyMovementBlocks(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const elements = [];
  let node;
  while ((node = walker.nextNode())) elements.push(node);

  for (const element of elements) {
    const text = (element.textContent || '').trim();
    if (element.classList.contains('hub-card') && text.includes('Your milestone journey')) {
      element.remove();
      continue;
    }
    if (text.includes('Auto-sync coming soon') && element.children.length <= 2) {
      const card = element.closest('div[style*="var(--green-soft)"]') || element;
      card.remove();
    }
  }
}

export default function MovementPolish(props) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [showActivity, setShowActivity] = useState(false);
  const activityLevel = props.activityLevel || 'moderate';
  const current = ACTIVITY_OPTIONS.find(option => option.value === activityLevel) || ACTIVITY_OPTIONS[1];
  const stepGoal = props.currentGoal || props.profile?.step_goal || 7500;

  useEffect(() => {
    const root = document.querySelector('.movement-polish');
    if (!root) return;
    removeLegacyMovementBlocks(root);
    const observer = new MutationObserver(() => removeLegacyMovementBlocks(root));
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function handleSetActivity(level) {
    start(async () => {
      const result = await setActivityLevelAction({ activityLevel: level });
      if (result?.error) return;
      setShowActivity(false);
      router.refresh();
    });
  }

  return (
    <div className="movement-polish">
      <style>{`
        .movement-polish .hub-card .mono,
        .movement-polish .metric-number,
        .movement-polish .stat-number {
          font-family:'Space Grotesk',sans-serif !important;
          font-variant-numeric:tabular-nums;
          letter-spacing:-.025em;
        }
        .movement-polish .qa-grid .qa-btn:nth-child(2) { display:none !important; }
        .movement-polish .setting-card { background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px;margin:0 18px 10px; }
        .movement-polish .setting-head { display:flex;justify-content:space-between;gap:12px;align-items:flex-start; }
        .movement-polish .setting-kicker { font-size:10px;letter-spacing:1.1px;text-transform:uppercase;color:var(--ink-45);font-weight:800; }
        .movement-polish .setting-title { font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:750;margin-top:3px; }
        .movement-polish .setting-value { font-size:12px;color:var(--ink-70);margin-top:3px; }
        .movement-polish .setting-button { border:0;background:var(--green-soft);color:var(--green-dark);border-radius:999px;padding:8px 11px;font-size:11.5px;font-weight:800;white-space:nowrap;cursor:pointer; }
        .movement-polish .setting-options { display:grid;gap:8px;margin-top:11px; }
        .movement-polish .setting-option { width:100%;text-align:left;background:#fff;border:1px solid var(--line);border-radius:12px;padding:11px 12px;cursor:pointer; }
        .movement-polish .setting-option.active { border:1.5px solid var(--green);background:var(--green-soft); }
        .movement-polish .setting-option strong { display:block;font-size:12px;color:var(--ink); }
        .movement-polish .setting-option span { display:block;font-size:11px;color:var(--ink-70);margin-top:3px; }
        .movement-polish .phone-card { background:var(--green-soft);border-radius:16px;padding:16px;margin:10px 18px 0; }
        .movement-polish .phone-coming-soon { display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:9.5px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:var(--green-dark);margin-bottom:8px; }
        .movement-polish .phone-title { font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:750; }
        .movement-polish .phone-copy { font-size:12px;line-height:1.5;color:var(--ink-70);margin-top:5px; }
        .movement-polish .phone-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px; }
        .movement-polish .phone-option { background:#fff;border:1px solid var(--line);border-radius:12px;padding:11px;display:flex;align-items:flex-start;gap:8px; }
        .movement-polish .phone-option strong { display:block;font-size:11.5px; }
        .movement-polish .phone-option span { display:block;font-size:10px;color:var(--ink-45);margin-top:3px;line-height:1.35; }
      `}</style>

      <div className="setting-card">
        <div className="setting-head">
          <div>
            <div className="setting-kicker">Your movement plan</div>
            <div className="setting-title">{current.label} activity</div>
            <div className="setting-value">Daily goal: <strong>{stepGoal.toLocaleString()} steps</strong></div>
          </div>
          <button type="button" className="setting-button" onClick={() => setShowActivity(v => !v)}>
            {showActivity ? 'Close' : 'Change activity'}
          </button>
        </div>
        {showActivity && (
          <div className="setting-options">
            {ACTIVITY_OPTIONS.map(option => (
              <button key={option.value} type="button" className={`setting-option${option.value === activityLevel ? ' active' : ''}`} onClick={() => !isPending && handleSetActivity(option.value)}>
                <strong>{option.label}</strong>
                <span>{option.desc} · {option.goal}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MovementClient {...props} />

      <div className="phone-card">
        <div className="phone-coming-soon">Coming soon</div>
        <div className="phone-title">Connect your phone</div>
        <div className="phone-copy">Automatic step syncing will use your phone’s health data when the Protlys mobile app is connected.</div>
        <div className="phone-grid">
          <div className="phone-option"><PhoneIcon type="apple" /><div><strong>iPhone</strong><span>Apple Health through the Protlys mobile app</span></div></div>
          <div className="phone-option"><PhoneIcon type="android" /><div><strong>Android</strong><span>Health Connect through the Protlys mobile app</span></div></div>
        </div>
      </div>
    </div>
  );
}
