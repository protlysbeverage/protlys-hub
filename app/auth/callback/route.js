import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getSafeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeNext(requestUrl.searchParams.get('next'));
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error || errorDescription) {
    const message = errorDescription || error || 'OAuth sign-in failed.';
    return NextResponse.redirect(
      new URL(`/login?error_message=${encodeURIComponent(message)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error_message=Missing%20OAuth%20authorization%20code', requestUrl.origin)
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/login?error_message=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  const termsVersion = user?.user_metadata?.terms_accepted ? (user.user_metadata?.terms_version || '2026-10-28') : null;
  if (user && termsVersion) await supabase.from('terms_acceptances').upsert({ user_id:user.id, version:termsVersion }, { onConflict:'user_id,version' });
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
