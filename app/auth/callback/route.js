import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeNext } from '@/lib/safe-redirect.mjs';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeNext(requestUrl.searchParams.get('next'));
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error || errorDescription) {
    return NextResponse.redirect(
      new URL('/login?error_message=OAuth%20sign-in%20failed.%20Please%20try%20again.', requestUrl.origin)
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
    console.error('OAuth callback: code exchange failed.');
    return NextResponse.redirect(
      new URL('/login?error_message=Sign-in%20could%20not%20be%20completed.%20Please%20try%20again.', requestUrl.origin)
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
