import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import SettingsClient from './SettingsClient';

export default async function SettingsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login?next=/settings');
  const {data:profile}=await supabase.from('profiles').select('display_name,target_g').eq('id',user.id).single();
  const createdAt=user.created_at;
  return <AppShell><SettingsClient name={profile?.display_name||''} email={user.email||''} targetG={Number(profile?.target_g)||120} joinedAt={createdAt}/></AppShell>;
}
