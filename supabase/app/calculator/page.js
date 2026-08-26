import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import CalculatorClient from './CalculatorClient';

export default async function CalculatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('target_g')
    .eq('id', user.id)
    .single();

  return (
    <AppShell>
      <CalculatorClient savedTarget={profile?.target_g || null} />
    </AppShell>
  );
}
