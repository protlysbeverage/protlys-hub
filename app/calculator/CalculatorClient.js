'use client';

import { useState, useTransition } from 'react';
import { saveTargetAction } from '@/app/actions';

const SEX = [
  { label: 'Male', v: 'male' },
  { label: 'Female', v: 'female' },
  { label: 'Prefer not to say', v: 'other' },
];

const ACTIVITY = [
  { label: 'Sedentary', detail: 'Desk job, little exercise', v: 1.0 },
  { label: 'Lightly active', detail: '1–2 days/week', v: 1.2 },
  { label: 'Moderately active', detail: '3–4 days/week', v: 1.375, default: true },
  { label: 'Very active', detail: '5–6 days/week', v: 1.55 },
  { label: 'Athlete', detail: 'Twice daily / hard training', v: 1.725 },
];

const GOALS = [
  { label: 'General health', detail: '0.8g / kg body weight', v: 0.8 },
  { label: 'Maintain & stay active', detail: '1.2–1.4g / kg', v: 1.2, default: true },
  { label: 'Build muscle', detail: '1.6–2.0g / kg', v: 1.6 },
  { label: 'Athletic performance', detail: '1.8–2.2g / kg', v: 1.8 },
  { label: 'Lose weight', detail: 'Higher protein preserves muscle in a calorie deficit', v: 1.2 },
];

function activityLabel(v) {
  const item = ACTIVITY.find((a) => a.v === v);
  return item?.label?.toLowerCase() || 'moderate';
}

export default function CalculatorClient({ savedTarget }) {
  const [weight, setWeight] = useState(70);
  const [sex, setSex] = useState('male');
  const [activity, setActivity] = useState(1.375);
  const [goal, setGoal] = useState(1.2);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [isPending, start] = useTransition();

  function calculate() {
    const w = Number(weight);
    if (!w || w < 20 || w > 300) return;

    const sexFactor = sex === 'female' ? 0.92 : sex === 'other' ? 0.96 : 1.0;
    const target = Math.round(w * goal * sexFactor);
    const min = Math.round(w * 0.8);
    const max = Math.round(w * 2.2);
    const pct = Math.min(100, Math.max(0, Math.round(((target - min) / (max - min)) * 100)));

    setResult({ target, min, max, pct, goal, activity, sex, weight: w });
    setSaved(false);
  }

  function saveTarget() {
    if (!result) return;
    start(async () => {
      await saveTargetAction({ targetG: result.target });
      setSaved(true);
    });
  }

  return (
    <div className="screen-pad" style={{ maxWidth: 520, margin: '0 auto' }}>
      <span className="eyebrow">Protlys</span>
      <h1 style={{ fontSize: 26 }}>Find your daily protein target</h1>
      <p className="subhead">Based on peer-reviewed nutrition science. Takes 30 seconds — gives you a number you can actually use.</p>

      <section className="section-card" style={{ marginTop: 18 }}>
        <span className="field-label">STEP 1 — YOUR WEIGHT</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <input id="weight" type="number" min="30" max="250" value={weight} onChange={(e) => setWeight(e.target.value)} className="field-input mono" style={{ fontSize: 28, fontWeight: 700, flex: 1 }} />
          <span className="mono" style={{ fontSize: 18, opacity: 0.55 }}>kg</span>
        </div>
      </section>

      <section className="section-card" style={{ marginTop: 14 }}>
        <span className="field-label">STEP 2 — BIOLOGICAL SEX</span>
        <div className="pill-select" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {SEX.map((item) => (
            <button key={item.v} className={`pill-opt${sex === item.v ? ' active' : ''}`} onClick={() => setSex(item.v)}>{item.label}</button>
          ))}
        </div>
      </section>

      <section className="section-card" style={{ marginTop: 14 }}>
        <span className="field-label">STEP 3 — ACTIVITY LEVEL</span>
        <div className="pill-select" style={{ marginTop: 8 }}>
          {ACTIVITY.map((item) => (
            <button key={item.v} className={`pill-opt${activity === item.v ? ' active' : ''}`} onClick={() => setActivity(item.v)}>
              <span>{item.label}</span>
              <small style={{ display: 'block', marginTop: 2, opacity: 0.7 }}>{item.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section-card" style={{ marginTop: 14 }}>
        <span className="field-label">STEP 4 — YOUR GOAL</span>
        <div className="pill-select" style={{ marginTop: 8 }}>
          {GOALS.map((item) => (
            <button key={`${item.label}-${item.v}`} className={`pill-opt${goal === item.v && (item.label !== 'Lose weight' || goal === 1.2) ? ' active' : ''}`} onClick={() => setGoal(item.v)}>
              <span>{item.label}</span>
              <small style={{ display: 'block', marginTop: 2, opacity: 0.7 }}>{item.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <button className="btn-primary" style={{ marginTop: 18 }} onClick={calculate}>Calculate my protein target →</button>

      {result && (
        <div style={{ marginTop: 26 }}>
          <div className="hr-tight" />

          <section className="section-card" style={{ marginTop: 20, border: '2px solid var(--green, #2E9E5B)' }}>
            <span className="eyebrow">Your daily protein target</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span className="mono" style={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>{result.target}</span>
              <span style={{ fontSize: 18, fontWeight: 700, opacity: 0.5 }}>g / day</span>
            </div>
            <p className="subhead" style={{ margin: '8px 0 14px' }}>
              Based on {result.weight.toFixed(1)}kg body weight · {result.goal}g per kg target · {activityLabel(result.activity)} activity
            </p>
            <div style={{ height: 8, background: 'var(--line, rgba(15,42,74,.12))', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${result.pct}%`, background: 'var(--green, #2E9E5B)', borderRadius: 999 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.55, marginTop: 5 }}>
              <span>WHO minimum (0.8g/kg)</span>
              <span>Athletic (2.2g/kg)</span>
            </div>
          </section>

          <section className="section-card" style={{ marginTop: 14 }}>
            <h2 className="section-title" style={{ fontSize: 16 }}>What that looks like per day</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
              <div className="data-chip" style={{ justifyContent: 'center', textAlign: 'center' }}><span className="value mono">{Math.round(result.target / 3)}g</span><span className="label">PER MEAL</span></div>
              <div className="data-chip" style={{ justifyContent: 'center', textAlign: 'center' }}><span className="value mono">{Math.round(result.target / 5)}g</span><span className="label">PER SNACK</span></div>
              <div className="data-chip" style={{ justifyContent: 'center', textAlign: 'center' }}><span className="value mono">{result.goal}g</span><span className="label">PER KG</span></div>
            </div>
          </section>

          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={saveTarget} disabled={isPending || saved}>
            {saved ? 'Target saved to your Hub' : isPending ? 'Saving…' : 'Save this as my daily target'}
          </button>

          <p className="disclaimer" style={{ marginTop: 14 }}>
            Estimates based on Harris-Benedict, ISSN guidelines, and WHO dietary protein reference values. Not medical advice — speak with a registered dietitian for personalised guidance.
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
