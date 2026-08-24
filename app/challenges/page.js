import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

const STATIC_CHALLENGES = [
  { name: 'Saturday Run',        meta: 'Complete a Saturday run and check in',    total: 1,     unit: 'runs',  reward: '+50 pts' },
  { name: '10,000 Step Challenge', meta: 'Complete 10,000 steps',                 total: 10000, unit: 'steps', reward: '+50 pts' },
  { name: '30-Day Consistency',  meta: 'Build a long-term routine',               total: 30,    unit: 'days',  reward: '+150 pts' },
];

export default async function ChallengesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('streak').eq('id', user.id).single();

  const streak = profile?.streak || 0;
  const streakChallenge = { name: '7-Day Protein Streak', meta: 'Build consistency for 7 days', progress: Math.min(7, streak), total: 7, unit: 'days', reward: '+30 pts', isStreak: true };
  const challenges = [streakChallenge, ...STATIC_CHALLENGES];

  return (
    <AppShell>
      <div className="screen-pad">
        <span className="eyebrow">Challenges</span>
        <h1 style={{ fontSize: 22 }}>Move. Check in. Earn.</h1>
      </div>
      <div className="screen-pad" style={{ paddingTop: 6 }}>
        {challenges.map((c, i) => {
          const progress = c.progress ?? 0;
          const pct = Math.round((progress / c.total) * 100);
          return (
            <div key={i} className="chal-card">
              <div className="chal-top">
                <div>
                  <div className="chal-title">{c.name}</div>
                  <div className="chal-meta">{c.meta}</div>
                </div>
                <span className="tag tag-mvp">{c.reward}</span>
              </div>
              <div className="pbar"><div className="pbar-fill" style={{ width: `${pct}%` }} /></div>
              <div className="chal-bottom">
                <span className="mono" style={{ fontSize: 12.5, color: 'var(--ink-70)' }}>
                  {progress.toLocaleString()} / {c.total.toLocaleString()} {c.unit}
                </span>
                {c.isStreak
                  ? <a href="/" className="link-btn">Log Protlys →</a>
                  : <span className="tag tag-next">Coming soon</span>
                }
              </div>
            </div>
          );
        })}
        <p className="disclaimer" style={{ marginTop: 16 }}>
          Step and run tracking requires the native Protlys app (coming soon). Your protein streak updates every time you log a product.
        </p>
      </div>
    </AppShell>
  );
}
