'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logProteinAction } from './actions';

const PRODUCTS = [
  { id: 'milk',    label: 'High-Protein Milk',    proteinG: 0 },
  { id: 'yoghurt', label: 'High-Protein Yoghurt', proteinG: 0 },
  { id: 'drink',   label: 'Protein Drink',        proteinG: 0 },
];

export default function HubClient({ profile, todayG, logs }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [panel, setPanel] = useState(null); // 'log' | 'history' | null
  const [toast, setToast] = useState('');
  const [toastTimer, setToastTimer] = useState(null);

  const targetG = profile?.target_g || 120;
  const streak = profile?.streak || 0;
  const points = profile?.points || 0;
  const progressPct = Math.min(100, Math.round((todayG / targetG) * 100));
  const chalProgress = Math.min(7, streak);
  const chalPct = Math.round((chalProgress / 7) * 100);

  function showToast(msg) {
    setToast(msg);
    if (toastTimer) clearTimeout(toastTimer);
    setToastTimer(setTimeout(() => setToast(''), 2800));
  }

  function handleLog(product) {
    startTransition(async () => {
      const result = await logProteinAction({ productId: product.id, productLabel: product.label, grams: product.proteinG });
      if (result?.error) { showToast(result.error); return; }
      showToast(`Logged ${product.label} · +10 Protlys Points`);
      setPanel(null);
      router.refresh();
    });
  }

  const name = profile?.display_name?.split(' ')[0] || 'there';

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: '#fff', borderRadius: 999,
          padding: '10px 18px', fontSize: 13, fontWeight: 600, zIndex: 999,
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{toast}</div>
      )}

      <div className="screen-pad">
        <span className="eyebrow">Protlys Hub</span>
        <h1 style={{ fontSize: 22 }}>Hi {name}. Let's hit your goals today.</h1>
      </div>

      <div className="screen-pad" style={{ paddingTop: 6 }}>

        {/* Protein progress */}
        <div className="hub-card">
          <div className="t">Protein progress</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 600 }}>{todayG}</span>
            <span className="mono" style={{ fontSize: 14, color: 'var(--ink-45)' }}>/ {targetG}g</span>
          </div>
          <div className="pbar"><div className="pbar-fill" style={{ width: `${progressPct}%` }} /></div>
        </div>

        {/* Streak + Points */}
        <div className="hub-grid" style={{ marginTop: 10 }}>
          <div className="hub-card">
            <div className="t">Streak</div>
            <div className="mono" style={{ fontSize: 24, fontWeight: 600 }}>{streak} {streak === 1 ? 'day' : 'days'}</div>
          </div>
          <div className="hub-card">
            <div className="t">Protlys Points</div>
            <div className="mono" style={{ fontSize: 24, fontWeight: 600 }}>{points}</div>
          </div>
        </div>

        {/* 7-day challenge */}
        <div className="hub-card" style={{ marginTop: 10 }}>
          <div className="t">7-Day Protein Streak</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{chalProgress} / 7 days</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--green-dark)', fontWeight: 700 }}>{chalPct}%</span>
          </div>
          <div className="pbar"><div className="pbar-fill" style={{ width: `${chalPct}%` }} /></div>
        </div>

        {/* Quick actions */}
        <h2 className="section-title" style={{ fontSize: 15, marginTop: 20 }}>Quick actions</h2>
        <div className="qa-grid">
          <button className="qa-btn" onClick={() => setPanel(panel === 'log' ? null : 'log')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>Log Protlys</span>
          </button>
          <button className="qa-btn" onClick={() => setPanel(panel === 'history' ? null : 'history')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></svg>
            <span>Today's log</span>
          </button>
          <Link href="/calculator" className="qa-btn" style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h2" /></svg>
            <span>Calculate protein</span>
          </Link>
          <Link href="/movement" className="qa-btn" style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span>Track steps</span>
          </Link>
          <Link href="/challenges" className="qa-btn" style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>
            <span>View challenges</span>
          </Link>
        </div>

        {/* Log panel */}
        {panel === 'log' && (
          <div style={{ marginTop: 16 }}>
            <div className="hr-tight" />
            <p className="subhead" style={{ marginBottom: 6 }}>What did you have?</p>
            {PRODUCTS.map((p) => (
              <div key={p.id} className="find-item" onClick={() => !isPending && handleLog(p)}
                style={{ opacity: isPending ? 0.6 : 1, cursor: isPending ? 'default' : 'pointer' }}>
                <span className="find-q">{p.label}</span>
                <span className="find-a">{p.proteinG > 0 ? `+${p.proteinG}g` : 'log serving'} →</span>
              </div>
            ))}
            <button className="link-btn" style={{ marginTop: 10 }} onClick={() => setPanel(null)}>Cancel</button>
          </div>
        )}

        {/* Today's log history panel */}
        {panel === 'history' && (
          <div style={{ marginTop: 16 }}>
            <div className="hr-tight" />
            <p className="subhead" style={{ marginBottom: 6 }}>Today's logs</p>
            {logs.length === 0
              ? <p className="disclaimer">Nothing logged today yet — use Log Protlys to start.</p>
              : logs.map((log, i) => (
                <div key={i} className="list-row" style={{ cursor: 'default' }}>
                  <div className="left"><span className="lbl" style={{ fontSize: 13 }}>{log.product_label}</span></div>
                  <span className="mono" style={{ fontSize: 12.5, color: 'var(--ink-70)' }}>+{log.grams}g</span>
                </div>
              ))
            }
            <button className="link-btn" style={{ marginTop: 10 }} onClick={() => setPanel(null)}>Close</button>
          </div>
        )}

        <p className="disclaimer" style={{ marginTop: 14 }}>
          Progress and points are saved to your account and sync across devices.
        </p>
      </div>
    </>
  );
}
