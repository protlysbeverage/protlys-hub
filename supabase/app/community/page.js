import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import CommunityClient from './CommunityClient';

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: posts }, { data: profile }] = await Promise.all([
    supabase.from('community_posts').select(`
      id, body, image_url, post_type, created_at,
      profiles(display_name),
      post_likes(count),
      post_comments(id, body, created_at, profiles(display_name))
    `).order('created_at', { ascending: false }).limit(30),
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
  ]);

  // Get which posts the current user has liked
  const { data: myLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id);
  const likedIds = new Set((myLikes || []).map(l => l.post_id));

  return (
    <AppShell>
      <CommunityClient
        posts={posts || []}
        likedIds={[...likedIds]}
        userId={user.id}
        profile={profile || {}}
      />
    </AppShell>
  );
}
