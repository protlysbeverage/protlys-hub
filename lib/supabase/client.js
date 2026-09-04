import { createBrowserClient } from '@supabase/ssr';

// Used inside components that run in the browser (anything marked "use client").
// Explicitly use PKCE so OAuth codes can be exchanged by the server callback.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'pkce',
      },
    }
  );
}
