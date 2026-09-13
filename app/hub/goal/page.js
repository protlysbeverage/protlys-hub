import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import GoalClient from './GoalClient';

export default async function GoalPage() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/hub/goal');
  const { data:profile } = await supabase.from('profiles').select('target_g').eq('id',user.id).single();
  const { data:history } = await supabase.from('protein_target_history').select('target_g,source,effective_from,created_at').eq('user_id',user.id).order('effective_from',{ascending:false}).order('created_at',{ascending:false}).limit(30);
  return <AppShell><GoalClient targetG={Number(profile?.target_g)||120} history={history||[]} /></AppShell>;
}
