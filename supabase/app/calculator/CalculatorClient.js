'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveTargetAction } from '@/app/actions';

const ACTIVITY = [
  { label: 'Low',       v: 1.0 },
  { label: 'Light',     v: 1.2 },
  { label: 'Moderate',  v: 1.4, default: true },
  { label: 'High',      v: 1.6 },
  { label: 'Very high', v: 1.8 },
];
const GOALS = [
  { label: 'General nutrition', v: 0.9 },
  { label: 'Maintain',          v: 1.0, default: true },
  { label: 'Build muscle',      v: 1.15 },
  { label: 'Active lifestyle',  v: 1.05 },
];

export default function CalculatorClient({ savedTarget }) {
  const [weight, setWeight]     = useState(65);
  const [activity, setActivity] = useState(1.4);
  const [goal, setGoal]         = useState(1.0);
  const [result, setResult]     = useState(null);
  const [saved, setSaved]       = useState(false);
  const [isPending, start]      = useTransition();

  function calculate() {
    setResult(Math.round(weight * activity * goal));
    setSaved(false);
  }

  function saveTarget() {
    start(async () => {
      await saveTargetAction({ targetG: result });
      setSaved(true);
    });
  }

  return (
    <div className="screen-pad">
      <span className="eyebrow">Protein calculator</span>
      <h1 style={{ fontSize: 22 }}>What's your daily target?</h1>
      <p className="subhead">An estimate to help you plan — not medical advice.</p>

      <div style={{ marginTop: 20 }}>
        <label className="field-label" htmlFor="weight">BODY WEIGHT (KG)</label>
        <input
          id="weight" type="number" min="30" max="180"
          value={weight} onChange={(e) => setWeight(Number(e.target.value))}
          className="field-input mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}
        />
      </div>

      <div style={{ marginTop: 18 }}>
        <label className="field-label">ACTIVITY LEVEL</label>
        <div className="pill-select">
          {ACTIVITY.map((a) => (
            <button key={a.v} className={`pill-opt${activity === a.v ? ' active' : ''}`}
              onClick={() => setActivity(a.v)}>{a.label}</button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <label className="field-label">GOAL</label>
        <div className="pill-select">
          {GOALS.map((g) => (
            <button key={g.v} className={`pill-opt${goal === g.v ? ' active' : ''}`}
              onClick={() => setGoal(g.v)}>{g.label}</button>
          ))}
        </div>
      </div>

      <button className="btn-primary" style={{ marginTop: 22 }} onClick={calculate}>
        Calculate your protein
      </button>

      {result && (
        <div style={{ marginTop: 26 }}>
          <div className="hr-tight" />
          <div style={{ textAlign: 'center' }}>
            <span className="eyebrow">Your estimated daily target</span>
            <div className="data-chip lg" style={{ margin: '8px auto 0', display: 'inline-flex' }}>
              <span className="value mono">{result}g</span>
              <span className="label">per day</span>
            </div>
          </div>

          <button
            className="btn-secondary" style={{ marginTop: 14 }}
            onClick={saveTarget} disabled={isPending || saved}
          >
            {saved ? '✓ Target saved to your Hub' : isPending ? 'Saving…' : 'Save this as my daily target'}
          </button>

          <div style={{ marginTop: 22 }}>
            <h2 className="section-title" style={{ fontSize: 16 }}>How Protlys can fit in</h2>
            <div className="find-item"><span className="find-q">Breakfast</span><span className="find-a">Yoghurt →</span></div>
            <div className="find-item"><span className="find-q">Lunch / snack</span><span className="find-a">Milk →</span></div>
            <div className="find-item"><span className="find-q">After exercise, on the move</span><span className="find-a">Drink →</span></div>
          </div>

          <p className="disclaimer" style={{ marginTop: 14 }}>
            This is an estimate based on general activity guidance, not medical advice. Talk to a healthcare provider for guidance specific to you.
          </p>
        </div>
      )}

      {savedTarget && !result && (
        <p className="disclaimer" style={{ marginTop: 14 }}>
          Your current saved target: <strong className="mono">{savedTarget}g / day</strong>
        </p>
      )}
    </div>
  );
}
