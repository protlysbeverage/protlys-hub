import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import HubClient from '@/app/HubClient';
import PublicHub from './PublicHub';

function nairobiDateStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
}

async function getFoundingCount(supabase) {
  const { data } = await supabase.from('hub_stats').select('founding_count').eq('id', true).maybeSingle();
  return Number(data?.founding_count || 0);
}

export default async function HubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const foundingCount = await getFoundingCount(supabase);
    return <div className="protlys-app"><div className="app-shell" style={{display:'block',minHeight:'100vh'}}><PublicHub foundingCount={foundingCount} /></div></div>;
  }

  const today = nairobiDateStr();
  const [{ data: profile }, { data: logs }, { data: movementDays }, { data: stats }] = await Promise.all([
    supabase.from('profiles').select('display_name,target_g,onboarding_complete').eq('id', user.id).single(),
    supabase.from('protein_logs').select('id,grams,product_label,logged_at').eq('user_id', user.id).eq('log_date', today).order('logged_at', { ascending:false }),
    supabase.from('daily_steps').select('step_date, steps').eq('user_id', user.id).gt('steps', 0).order('step_date', { ascending:true }),
    supabase.from('hub_stats').select('founding_count').eq('id', true).maybeSingle(),
  ]);

  const todayG = (logs || []).reduce((sum, r) => sum + (Number(r.grams) || 0), 0);
  const foundingCount = Number(stats?.founding_count || 0);

  return <AppShell><HubClient profile={profile || {display_name:user.email,target_g:120,onboarding_complete:false}} todayG={todayG} logs={logs || []} movementDays={movementDays || []} foundingCount={foundingCount}/></AppShell>;
}
