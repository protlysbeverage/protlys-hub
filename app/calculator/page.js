import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import CalculatorClient from './CalculatorClient';

export default async function CalculatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let savedTarget = null;
  let profile = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('target_g, display_name, avatar_url').eq('id', user.id).single();
    profile = data || null;
    savedTarget = profile?.target_g || null;
  }

  return (
    <AppShell>
      <CalculatorClient savedTarget={savedTarget} profile={profile} />
    </AppShell>
  );
}