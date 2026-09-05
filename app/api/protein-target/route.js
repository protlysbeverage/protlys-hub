import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const url = new URL(request.url);
  const rawTarget = Number(url.searchParams.get('target'));
  const target = Number.isFinite(rawTarget) ? Math.round(rawTarget) : 0;

  if (!user) {
    const next = `/api/protein-target?target=${encodeURIComponent(target)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (target < 20 || target > 500) {
    redirect('/account?protein_target_error=invalid');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ target_g: target })
    .eq('id', user.id);

  if (error) {
    redirect('/account?protein_target_error=save');
  }

  redirect('/account?protein_target=saved');
}
