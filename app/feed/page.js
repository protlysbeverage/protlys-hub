import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import FeedClient from '@/app/FeedClient';
import { getFeedPage } from '@/lib/feed-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=%2Ffeed');

  const [{ data: profile, error: profileError }, feed] = await Promise.all([
    supabase.from('profiles').select('id,display_name,avatar_url').eq('id', user.id).maybeSingle(),
    getFeedPage(supabase, user.id, 0),
  ]);

  const loadError = feed.error || profileError?.message || null;

  return (
    <AppShell>
      <FeedClient
        posts={feed.posts || []}
        likedIds={feed.likedIds || []}
        userId={user.id}
        profile={profile || null}
        loadError={loadError}
        hasMore={Boolean(feed.hasMore)}
        nextOffset={Number(feed.nextOffset || 0)}
      />
    </AppShell>
  );
}
