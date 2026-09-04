import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    const message = errorDescription || error;
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

  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
