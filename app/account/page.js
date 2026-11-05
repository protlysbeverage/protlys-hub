import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import AccountClient from './AccountClient';
import ProteinTargetCard from './ProteinTargetCard';
import TargetHistory from './TargetHistory';
import FirstVisitDashboard from './FirstVisitDashboard';

function getShopUrl(){return 'https://protlys.com/collections/all';}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountPage({ searchParams }){
  const params = await searchParams;
  const showWelcome = params?.welcome === '1';
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect('/login');
  const [{data:profile},{data:targetHistory}]=await Promise.all([
    supabase.from('profiles').select('id,display_name,avatar_url,created_at,streak,target_g,step_streak,total_steps,step_goal,onboarding_complete').eq('id',user.id).single(),
    supabase.from('protein_target_history').select('target_g,effective_from,source').eq('user_id',user.id).order('effective_from',{ascending:true}).order('created_at',{ascending:true}),
  ]);
  const firstName = profile?.display_name?.split(/\\s+/)[0] || 'there';
  return <AppShell>{showWelcome && <FirstVisitDashboard name={firstName} targetG={profile?.target_g}/>}<div className="screen-pad" style={{paddingBottom:0,display:'flex',justifyContent:'flex-end'}}><a href="/settings" className="link-btn" style={{textDecoration:'none'}}>Settings →</a></div><ProteinTargetCard targetG={profile?.target_g}/><div className="screen-pad" style={{paddingTop:0,paddingBottom:0}}><TargetHistory rows={targetHistory||[]}/></div><AccountClient profile={profile||{}} todaySteps={0} weekSteps={[]} movementDays={[]} shopUrl={getShopUrl()} email={user.email}/><div className="screen-pad" style={{paddingTop:8,paddingBottom:100,textAlign:'center',fontSize:9.5,color:'var(--ink-45)'}}>v{String(process.env.NEXT_PUBLIC_BUILD_SHA||'local').slice(0,7)} · {String(process.env.NEXT_PUBLIC_BUILD_DATE||'local').slice(0,10)}</div></AppShell>;
}
