import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import HubClient from '@/app/HubClient';
import PublicHub from './PublicHub';

function nairobiDateStr(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
async function getFoundingCount(supabase){const {data}=await supabase.from('hub_stats').select('founding_count').eq('id',true).maybeSingle();return Number(data?.founding_count||0);}

export default async function HubPage(){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user){const foundingCount=await getFoundingCount(supabase);return <div className="protlys-app"><div className="app-shell" style={{display:'block',minHeight:'100vh'}}><PublicHub foundingCount={foundingCount}/></div></div>;}
  const today=nairobiDateStr();
  const [{data:profile},{data:logs},{data:recentMovement},{data:stats}]=await Promise.all([
    supabase.from('profiles').select('display_name,target_g,onboarding_complete').eq('id',user.id).single(),
    supabase.from('protein_logs').select('id,grams,product_label,logged_at').eq('user_id',user.id).eq('log_date',today).order('logged_at',{ascending:false}),
    // The dashboard only renders the current 7-day view. Avoid downloading a user's full movement history here.
    supabase.from('daily_steps').select('step_date,steps').eq('user_id',user.id).gt('steps',0).order('step_date',{ascending:false}).limit(7),
    supabase.from('hub_stats').select('founding_count').eq('id',true).maybeSingle(),
  ]);
  const todayG=(logs||[]).reduce((sum,r)=>sum+(Number(r.grams)||0),0); const foundingCount=Number(stats?.founding_count||0); const movementDays=[...(recentMovement||[])].reverse();
  return <AppShell><div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:10,paddingBottom:0}}><div style={{display:'flex',justifyContent:'flex-end',gap:7}}><a href="/hub/week" className="link-btn" style={{textDecoration:'none'}}>Week</a><a href="/hub/goal" className="link-btn" style={{textDecoration:'none'}}>Goal</a></div></div><HubClient profile={profile||{display_name:user.email,target_g:120,onboarding_complete:false}} todayG={todayG} logs={logs||[]} movementDays={movementDays} foundingCount={foundingCount}/></AppShell>;
}
