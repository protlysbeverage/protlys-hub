import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import InviteClient from './InviteClient';

export default async function InvitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/invite');
  return <AppShell><InviteClient /></AppShell>;
}
