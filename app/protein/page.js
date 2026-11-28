import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ProteinClient from './ProteinClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function nairobiDate(offset=0) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' })
    .formatToParts(new Date()).reduce((result, part) => (result[part.type]=part.value,result), {});
  return new Date(Date.UTC(Number(parts.year), Number(parts.month)-1, Number(parts.day)+offset)).toISOString().slice(0,10);
}
function weekDates() {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone:'Africa/Nairobi', weekday:'short' }).format(new Date());
  const offsets = { Mon:0, Tue:1, Wed:2, Thu:3, Fri:4, Sat:5, Sun:6 };
  const mondayOffset = -(offsets[weekday] ?? 0);
  return Array.from({length:7}, (_, index) => nairobiDate(mondayOffset + index));
}

export default async function ProteinPage() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/protein');

  const today = nairobiDate(0);
  const dates = weekDates();
  const start = dates[0];
  const [{ data:profile }, { data:logs }, { data:weekLogs }, { data:history }] = await Promise.all([
    supabase.from('profiles').select('target_g').eq('id', user.id).maybeSingle(),
    supabase.from('protein_logs').select('id,product_id,product_label,grams,log_date,logged_at').eq('user_id',user.id).eq('log_date',today).order('logged_at',{ascending:true}),
    supabase.from('protein_logs').select('grams,log_date').eq('user_id',user.id).gte('log_date',start).lte('log_date',today),
    supabase.from('protein_target_history').select('target_g,effective_from,created_at').eq('user_id',user.id).lte('effective_from',today).order('effective_from',{ascending:true}).order('created_at',{ascending:true}),
  ]);

  const target = Number(profile?.target_g) || 120;
  const weekDays = dates.map(date=>{
    const grams = (weekLogs||[]).filter(row=>row.log_date===date).reduce((sum,row)=>sum+Number(row.grams||0),0);
    const matches = (history||[]).filter(row=>row.effective_from<=date);
    const dayTarget = Number(matches[matches.length-1]?.target_g) || target;
    return {date,grams,target:dayTarget};
  });

  return <AppShell><ProteinClient today={today} targetG={target} initialLogs={logs||[]} weekDays={weekDays}/></AppShell>;
}
