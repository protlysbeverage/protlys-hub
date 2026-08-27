import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import HubClient from './HubClient';

export default async function HubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Load today's protein log, streak and points from Supabase
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: logs }] = await Promise.all([
    supabase.from('profiles').select('display_name, points, streak, last_log_date, target_g').eq('id', user.id).single(),
    supabase.from('protein_logs').select('grams, product_label, logged_at').eq('user_id', user.id).eq('log_date', today).order('logged_at', { ascending: false }),
  ]);

  const todayG = (logs || []).reduce((sum, r) => sum + (r.grams || 0), 0);

  return (
    <AppShell>
      <HubClient
        profile={profile || { display_name: user.email, points: 0, streak: 0, target_g: 120 }}
        todayG={todayG}
        logs={logs || []}
      />
    </AppShell>
  );
}
