import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import AccountClient from './AccountClient';
import ProteinTargetCard from './ProteinTargetCard';
import TargetHistory from './TargetHistory';
import FirstVisitDashboard from './FirstVisitDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountPage({ searchParams }) {
  const params = await searchParams;
  const showWelcome = params?.welcome === '1';
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data:profile }, { data:targetHistory }, { data:foundingGroup }] = await Promise.all([
    supabase.from('profiles').select('id,display_name,avatar_url,created_at,streak,target_g,step_streak,total_steps,step_goal,onboarding_complete').eq('id',user.id).single(),
    supabase.from('protein_target_history').select('target_g,effective_from,source').eq('user_id',user.id).order('effective_from',{ascending:true}).order('created_at',{ascending:true}),
    supabase.from('groups').select('id').eq('name','Founding 250').maybeSingle(),
  ]);

  let foundingMember = false;
  if (foundingGroup?.id) {
    const { data:membership } = await supabase.from('group_members').select('group_id').eq('group_id',foundingGroup.id).eq('user_id',user.id).maybeSingle();
    foundingMember = Boolean(membership);
  }
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] || 'there';

  return <AppShell>
    {showWelcome && <FirstVisitDashboard name={firstName} targetG={profile?.target_g}/>}
    <div className="account-screen-content">
      <div className="screen-pad" style={{paddingBottom:0,display:'flex',justifyContent:'flex-end'}}><a href="/settings" className="link-btn" style={{textDecoration:'none'}}>Settings →</a></div>
      <ProteinTargetCard targetG={profile?.target_g}/>
      <div className="screen-pad" style={{paddingTop:0,paddingBottom:0}}><TargetHistory rows={targetHistory||[]}/></div>
      <AccountClient profile={profile||{}} todaySteps={0} weekSteps={[]} movementDays={[]} email={user.email} foundingMember={foundingMember}/>
    </div>
  </AppShell>;
}
