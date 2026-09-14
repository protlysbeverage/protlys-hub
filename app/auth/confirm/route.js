import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getSafeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') || 'email';
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

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
