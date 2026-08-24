import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Used inside server components, server actions, and route handlers.
// Reads/writes the login session via cookies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component sometimes — safe to
            // ignore if middleware is also refreshing the session below.
          }
        },
      },
    }
  );
}
