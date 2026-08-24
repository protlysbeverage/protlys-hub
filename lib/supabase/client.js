import { createBrowserClient } from '@supabase/ssr';

// Used inside components that run in the browser (anything marked "use client").
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
