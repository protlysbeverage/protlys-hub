'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { confirmCalculatorTargetAction } from '@/app/actions';
import { PROTEIN_CALCULATOR_CONFIG } from '@/app/calculator/protein-calculator-config';

const GOALS = [
  { key: 'health', label: 'Stay healthy' },
  { key: 'muscle', label: 'Build muscle' },
  { key: 'lose', label: 'Lose fat' },
];
const ACTIVITY = [
  { key: 'light', label: 'Light' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'very', label: 'Very' },
];
const WEIGHT_MIN = 20;
const WEIGHT_MAX = 300;

function BackIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>;
}

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('health');
  const [activity, setActivity] = useState('moderate');
  const [target, setTarget] = useState(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const gramsPerKg = PROTEIN_CALCULATOR_CONFIG.formula.goals[goal]?.gramsPerKg || 0.8;

  useEffect(() => {
    if (step === 2) window.history.pushState({ protlysOnboardingStep: 2 }, '');
  }, [step]);

  useEffect(() => {
    const onPopState = () => {
      if (step === 2) setStep(1);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [step]);

  function goBack() {
    if (step === 2) return setStep(1);
    router.back();
  }

  function calculate() {
    const kg = Number(weight);
    if (!weight || !Number.isFinite(kg) || kg < WEIGHT_MIN || kg > WEIGHT_MAX) {
      setError(`Enter a weight between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg.`);
      return;
    }
    setError('');
    setTarget(Math.max(20, Math.min(500, Math.round(kg * gramsPerKg))));
    setStep(2);
  }

  function save() {
    if (!target) return;
    startTransition(async () => {
      const result = await confirmCalculatorTargetAction({ targetG: target });
      if (result?.error) return setError(result.error);
      setSaved(true);
      window.setTimeout(() => router.replace('/account?welcome=1'), 500);
    });
  }

  return (
    <main className="protlys-onboarding" aria-label="Set your daily protein target">
      <header className="protlys-onboarding-topbar">
        <button type="button" className="protlys-onboarding-icon-btn" onClick={goBack} aria-label={step === 2 ? 'Back to protein target answers' : 'Go back'}><BackIcon /></button>
        <img src="/protlys-logo-exact.png" className="protlys-onboarding-logo" alt="Protlys" width="2000" height="973" />
        <span className="protlys-onboarding-step mono">Step {step} of 2</span>
      </header>

      <section className="protlys-onboarding-content">
        {step === 1 ? (
          <>
            <div className="protlys-onboarding-heading">
              <span className="protlys-onboarding-kicker mono">Step 1 of 2</span>
              <h1>Set your daily protein target</h1>
              <p>Tell us a little about yourself and we’ll calculate a simple daily target.</p>
            </div>

            <div className="protlys-onboarding-field">
              <label htmlFor="protein-weight">Weight in kg</label>
              <input id="protein-weight" className="protlys-onboarding-input mono" type="number" inputMode="decimal" min={WEIGHT_MIN} max={WEIGHT_MAX} step="0.1" value={weight} onChange={event => { setWeight(event.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'protein-weight-error' : undefined} placeholder="e.g. 70" />
              {error && <p id="protein-weight-error" className="protlys-onboarding-error" role="alert">{error}</p>}
            </div>

            <fieldset className="protlys-onboarding-group">
              <legend>Goal</legend>
              <div className="protlys-onboarding-pills">
                {GOALS.map(item => <button key={item.key} type="button" className={`protlys-onboarding-pill${goal === item.key ? ' is-selected' : ''}`} aria-pressed={goal === item.key} onClick={() => setGoal(item.key)}>{item.label}</button>)}
              </div>
            </fieldset>

            <fieldset className="protlys-onboarding-group">
              <legend>Activity</legend>
              <div className="protlys-onboarding-pills">
                {ACTIVITY.map(item => <button key={item.key} type="button" className={`protlys-onboarding-pill${activity === item.key ? ' is-selected' : ''}`} aria-pressed={activity === item.key} onClick={() => setActivity(item.key)}>{item.label}</button>)}
              </div>
            </fieldset>

            <button type="button" className="btn-primary protlys-onboarding-primary" onClick={calculate} disabled={pending}>Calculate my target</button>
          </>
        ) : (
          <>
            <div className="protlys-onboarding-heading">
              <span className="protlys-onboarding-kicker mono">Step 2 of 2</span>
              <h1>Your daily target</h1>
              <p>Based on your answers, here’s your starting daily protein target.</p>
            </div>
            <section className="protlys-onboarding-result" aria-live="polite">
              <div className="protlys-onboarding-target"><span className="protlys-onboarding-number">{target}</span><span className="protlys-onboarding-unit mono">g</span></div>
              <p className="protlys-onboarding-calculation mono">{weight} kg × {gramsPerKg} g per kg</p>
            </section>
            {saved && <p className="protlys-onboarding-success" role="status">Saved. Taking you to your dashboard…</p>}
            <button type="button" className="btn-primary protlys-onboarding-primary" onClick={save} disabled={pending || saved}>{pending ? 'Saving…' : 'Save to my dashboard'}</button>
            <button type="button" className="btn-secondary protlys-onboarding-secondary" onClick={() => setStep(1)} disabled={pending || saved}>Change my answers</button>
          </>
        )}
      </section>
      <p className="protlys-onboarding-note">General guidance, not medical advice.</p>
    </main>
  );
}
