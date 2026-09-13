import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ChallengesClient from './ChallengesClient';

function weekDates() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
  const y = Number(parts.find(p=>p.type==='year')?.value), m = Number(parts.find(p=>p.type==='month')?.value), d = Number(parts.find(p=>p.type==='day')?.value);
  const local = new Date(Date.UTC(y,m-1,d));
  const day = local.getUTCDay();
  const monday = new Date(local); monday.setUTCDate(local.getUTCDate() - (day === 0 ? 6 : day - 1));
  return Array.from({length:7}, (_,i)=>{ const x=new Date(monday); x.setUTCDate(monday.getUTCDate()+i); return x.toISOString().slice(0,10); });
}

export default async function ChallengesPage() {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return <AppShell><div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:28}}><span className="eyebrow">Challenges</span><h1 style={{fontSize:28,marginTop:6}}>Build the habit together.</h1><p className="subhead" style={{marginTop:8}}>Sign in to take part in short, simple protein challenges.</p></div></AppShell>;

  const dates = weekDates();
  const [{data:weekLogs},{data:allLogs},{data:stats}] = await Promise.all([
    supabase.from('protein_logs').select('log_date,grams').eq('user_id',user.id).gte('log_date',dates[0]).lte('log_date',dates[6]),
    supabase.from('protein_logs').select('log_date').eq('user_id',user.id),
    supabase.from('hub_stats').select('founding_count').eq('id',true).maybeSingle(),
  ]);
  const loggedDates = [...new Set((weekLogs||[]).map(r=>r.log_date))];
  const foundingDays = [...new Set((allLogs||[]).map(r=>r.log_date))];
  return <AppShell><ChallengesClient weekDates={dates} loggedDates={loggedDates} foundingEligible={foundingDays.length >= 5} foundingCount={Number(stats?.founding_count||0)} /></AppShell>;
}
