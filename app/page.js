import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import FeedClient from './FeedClient';

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: posts }, { data: profile }, { data: myLikes }] = await Promise.all([
    supabase.from('feed_posts')
      .select(`
        id, body, image_url, post_type, stats, created_at,
        profiles(id, display_name, avatar_url),
        feed_likes(count),
        feed_comments(id, body, created_at, profiles(display_name))
      `)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('profiles').select('display_name, avatar_url, points, step_streak').eq('id', user.id).single(),
    supabase.from('feed_likes').select('post_id').eq('user_id', user.id),
  ]);

  const likedIds = new Set((myLikes || []).map(l => l.post_id));

  return (
    <AppShell>
      <FeedClient
        posts={posts || []}
        likedIds={[...likedIds]}
        userId={user.id}
        profile={profile || {}}
      />
    </AppShell>
  );
}
