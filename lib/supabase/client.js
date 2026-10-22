import { createBrowserClient } from '@supabase/ssr';

let browserClient;

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error('Supabase environment variables are missing.');
  }

  return { url, key };
}

// Keep one browser client for the lifetime of the page so auth state,
// storage and refresh handling are not split across multiple instances.
export function createClient() {
  if (browserClient) return browserClient;

  const { url, key } = getSupabaseConfig();

  browserClient = createBrowserClient(url, key, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
