import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import HubClient from '@/app/HubClient';

function nairobiDateStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
}

export default async function HubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = nairobiDateStr();
  const [{ data: profile }, { data: logs }, { data: movementDays }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('protein_logs').select('grams, product_label, logged_at').eq('user_id', user.id).eq('log_date', today).order('logged_at', { ascending:false }),
    supabase.from('daily_steps').select('step_date, steps').eq('user_id', user.id).gt('steps', 0).order('step_date', { ascending:true }),
  ]);

  const todayG = (logs || []).reduce((sum, r) => sum + (r.grams || 0), 0);

  return (
    <AppShell>
      <HubClient profile={profile || { display_name:user.email }} todayG={todayG} logs={logs || []} movementDays={movementDays || []} />
    </AppShell>
  );
}
