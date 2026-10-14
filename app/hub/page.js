import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import OnboardingClient from './OnboardingClient';
import PublicHub from './PublicHub';

function nairobiDateStr(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
async function getFoundingCount(supabase){const {data}=await supabase.from('hub_stats').select('founding_count').eq('id',true).maybeSingle();return Number(data?.founding_count||0);}

export default async function HubPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  if(!user){
    const foundingCount=await getFoundingCount(supabase);
    return <div className="protlys-app"><div className="app-shell" style={{display:'block',minHeight:'100vh'}}><PublicHub foundingCount={foundingCount}/></div></div>;
  }

  const {data:profile}=await supabase.from('profiles').select('display_name,target_g,onboarding_complete').eq('id',user.id).single();

  // A saved target means onboarding is already complete for the purposes of this flow.
  // Always take established users to the Dashboard rather than showing first-run UI.
  if (profile?.target_g) redirect('/account');

  return <AppShell><OnboardingClient /></AppShell>;
}
