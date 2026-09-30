import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import AccountClient from './AccountClient';
import ProteinTargetCard from './ProteinTargetCard';
import TargetHistory from './TargetHistory';

function localDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}
function getShopUrl(){return 'https://protlys.com/collections/all';}

export default async function AccountPage(){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect('/login');
  const today=localDateStr(); const weekAgoDate=new Date(today + 'T12:00:00+03:00'); weekAgoDate.setUTCDate(weekAgoDate.getUTCDate()-6); const weekAgo=localDateStr(weekAgoDate);
  const [{data:profile},{data:achievements},{data:todaySteps},{data:weekSteps},{data:movementDays},{data:targetHistory}]=await Promise.all([
    supabase.from('profiles').select('id,display_name,avatar_url,streak,target_g,step_streak,total_steps,step_goal').eq('id',user.id).single(),
    supabase.from('user_achievements').select('earned_at,achievements(slug,name,icon,description)').eq('user_id',user.id).order('earned_at',{ascending:false}),
    supabase.from('daily_steps').select('steps,source,synced_at').eq('user_id',user.id).eq('step_date',today).single(),
    supabase.from('daily_steps').select('step_date,steps').eq('user_id',user.id).gte('step_date',weekAgo).lte('step_date',today).order('step_date'),
    supabase.from('daily_steps').select('step_date,steps').eq('user_id',user.id).order('step_date',{ascending:false}).limit(365),
    supabase.from('protein_target_history').select('target_g,effective_from,source').eq('user_id',user.id).order('effective_from',{ascending:true}).order('created_at',{ascending:true}),
  ]);
  return <AppShell><div className="screen-pad" style={{paddingBottom:0,display:'flex',justifyContent:'flex-end'}}><a href="/settings" className="link-btn" style={{textDecoration:'none'}}>Settings →</a></div><ProteinTargetCard targetG={profile?.target_g}/><div className="screen-pad" style={{paddingTop:0,paddingBottom:0}}><TargetHistory rows={targetHistory||[]}/></div><AccountClient profile={profile||{}} achievements={achievements||[]} todaySteps={todaySteps?.steps||0} weekSteps={weekSteps||[]} movementDays={movementDays||[]} shopUrl={getShopUrl()} email={user.email}/></AppShell>;
}
