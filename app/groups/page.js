import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import GroupsClient from './GroupsClient';

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, privacy)')
    .eq('user_id', user.id);
  return <AppShell><GroupsClient initialGroups={(memberships || []).map(function(row){return row.groups;}).filter(Boolean)} /></AppShell>;
}
