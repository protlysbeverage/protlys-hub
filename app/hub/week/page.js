import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import WeekClient from './WeekClient';

function dateInNairobi(offset=0){
  const now=new Date();
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).reduce((a,p)=>(a[p.type]=p.value,a),{});
  const utc=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)+offset);
  return new Date(utc).toISOString().slice(0,10);
}
function weekDates(){
  const now=new Date();
  const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Nairobi',weekday:'short'}).format(now);
  const map={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
  const sundayOffset=6-(map[weekday]??0);
  const mondayOffset=-((map[weekday]??0));
  return Array.from({length:7},(_,i)=>dateInNairobi(mondayOffset+i));
}

export default async function WeekPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login?next=/hub/week');
  const dates=weekDates();
  const start=dates[0], end=dates[6];
  const [{data:logs},{data:profile},{data:history}]=await Promise.all([
    supabase.from('protein_logs').select('id,grams,product_label,logged_at,log_date').eq('user_id',user.id).gte('log_date',start).lte('log_date',end).order('logged_at',{ascending:true}),
    supabase.from('profiles').select('target_g').eq('id',user.id).single(),
    supabase.from('protein_target_history').select('target_g,source,effective_from,created_at').eq('user_id',user.id).lte('effective_from',end).order('effective_from',{ascending:true}).order('created_at',{ascending:true}),
  ]);
  return <AppShell><WeekClient dates={dates} logs={logs||[]} currentTarget={Number(profile?.target_g)||120} history={history||[]}/></AppShell>;
}
