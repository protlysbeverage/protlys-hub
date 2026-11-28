import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getSafeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/hub';
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = 'email';
  const next = getSafeNext(requestUrl.searchParams.get('next'));

  if (!tokenHash) {
    return NextResponse.redirect(
      new URL('/login?error_message=Missing%20email%20verification%20token', requestUrl.origin)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error_message=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  const referralCode = String(
    request.cookies.get('protlys_referral_code')?.value ||
    user?.user_metadata?.referral_code ||
    ''
  ).trim().toUpperCase();
  if (user && /^[A-Z0-9]{8,32}$/.test(referralCode)) {
    await supabase.rpc('apply_referral_code', { p_code: referralCode });
  }
  const termsVersion = user?.user_metadata?.terms_accepted
    ? (user.user_metadata?.terms_version || '2026-10-28')
    : null;
  if (user && termsVersion) {
    await supabase.from('terms_acceptances').upsert(
      { user_id: user.id, version: termsVersion },
      { onConflict: 'user_id,version' }
    );
  }
  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  if (user && referralCode) {
    response.cookies.set('protlys_referral_code', '', {
      path: '/', maxAge: 0, sameSite: 'lax', secure: true,
    });
  }
  return response;
}
