import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import MovementPolish from './MovementPolish';

export default async function MovementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <AppShell>
      <MovementPolish userId={user.id} />
    </AppShell>
  );
}
