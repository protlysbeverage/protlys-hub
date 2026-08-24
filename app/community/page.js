import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

const COMMUNITY = [
  { tag: 'tag-next',  tagLabel: 'Next',  title: 'Saturday Runs',    desc: 'Show up to a partner run, check in with your QR code, and earn Protlys Points before you\'ve even had breakfast.' },
  { tag: 'tag-next',  tagLabel: 'Next',  title: 'Gym Partners',     desc: 'Find a partner gym, see the current challenge, check in, and pick up Protlys on site.' },
  { tag: 'tag-later', tagLabel: 'Later', title: 'Campus Challenges', desc: 'Step challenges, team competitions, and sampling for university campuses — energetic, not exclusive.' },
  { tag: 'tag-later', tagLabel: 'Later', title: 'Events',            desc: 'Find Protlys at the runs, gyms, and campus activations already happening near you.' },
];

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <AppShell>
      <div className="screen-pad">
        <span className="eyebrow">Community</span>
        <h1 style={{ fontSize: 22 }}>Community that moves together.</h1>
      </div>
      <div className="screen-pad" style={{ paddingTop: 6 }}>
        {COMMUNITY.map((item, i) => (
          <div key={i} className="learn-card">
            <div className="lc-top">
              <span className={`tag ${item.tag}`}>{item.tagLabel}</span>
              <h3 className="lc-title">{item.title}</h3>
            </div>
            <p className="lc-desc">{item.desc}</p>
          </div>
        ))}
        <p className="disclaimer" style={{ marginTop: 16 }}>
          Community events require the native Protlys app. Partner locations and events launching soon.
        </p>
      </div>
    </AppShell>
  );
}
