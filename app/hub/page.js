import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
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

  // New profiles receive a database default of 120g, but that is only a placeholder.
  // A first-time user must complete the protein calculator before entering the Hub.
  if (!profile?.onboarding_complete) redirect('/calculator');

  // Established users with a completed onboarding flow go straight to the dashboard.
  if (profile?.target_g) redirect('/account');

  // Safety fallback: if a profile is marked complete but has no target, send it through the calculator.
  redirect('/calculator');
}
