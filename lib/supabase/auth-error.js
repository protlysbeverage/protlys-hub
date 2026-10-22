export function getSupabaseAuthError(error, context='auth') {
  const message = error?.message || 'Unknown Supabase authentication error.';
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  let host = 'unknown';
  try {
    host = new URL(rawUrl).host || 'unknown';
  } catch {
    host = 'invalid-url';
  }

  console.error('[Protlys Auth]', {
    context,
    message,
    supabaseHost: host,
    code: error?.code,
    status: error?.status,
  });

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Can't reach the server. Check your connection and try again.";
  }

  return message;
}
