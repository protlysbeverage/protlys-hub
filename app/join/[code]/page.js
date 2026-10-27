import {createClient} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
export default async function JoinDeepLink({params}){const p=await params;const code=String(p?.code||'').toUpperCase();const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user){redirect('/login?next='+encodeURIComponent('/join/'+code))}redirect('/challenges/join?code='+encodeURIComponent(code))}
