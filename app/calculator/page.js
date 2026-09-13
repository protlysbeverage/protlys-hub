import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import CalculatorClient from './CalculatorClient';

export default async function CalculatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let savedTarget = null;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('target_g').eq('id', user.id).single();
    savedTarget = profile?.target_g || null;
  }

  return (
    <AppShell>
      <CalculatorClient savedTarget={savedTarget} />
    </AppShell>
  );
}
