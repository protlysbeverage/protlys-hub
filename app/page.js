import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import FeedClient from './FeedClient';
import FollowingFeed from './FollowingFeed';
import FeedModeTabs from '@/components/FeedModeTabs';
import FeedVisualPatch from '@/components/FeedVisualPatch';
import FeedInteractionEnhancer from './FeedInteractionEnhancer';
import { getBlockedUserIds } from '@/lib/blocks';

export default async function FeedPage({ searchParams }) {
  const params = await searchParams;
  const mode = params?.feed === 'following' ? 'following' : 'for-you';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: followingRows }, { data: cheerNotifications }] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url, points, step_streak').eq('id', user.id).single(),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
    supabase.from('notifications').select('id,body,created_at,is_read').eq('user_id',user.id).eq('type','cheer').order('created_at',{ascending:false}).limit(5),
  ]);

  const blockedIds = await getBlockedUserIds(supabase, user.id);
  const blockedSet = new Set(blockedIds.map(String));
  const followingIds = (followingRows || []).map(row => row.following_id).filter(id => id && !blockedSet.has(String(id)));
  let normalizedPosts = [];
  let likedIds = [];

  if (mode === 'following') {
    const { data: posts } = followingIds.length ? await supabase
      .from('feed_posts')
      .select(`id, user_id, body, image_url, post_type, stats, created_at, profiles(id, display_name, avatar_url), feed_likes(count), feed_comments(count)`)
      .in('user_id', followingIds)
      .order('created_at', { ascending:false })
      .limit(30) : { data: [] };
    normalizedPosts = (posts || []).filter(post => !blockedSet.has(String(post.user_id))).map(post => ({ ...post, like_count: post.feed_likes?.[0]?.count || 0, comment_count: post.feed_comments?.[0]?.count || 0, profiles: post.profiles || { id: post.user_id, display_name:null, avatar_url:null } }));
  } else {
    const [{ data: posts }, { data: myLikes }] = await Promise.all([
      supabase.from('feed_posts').select(`id, user_id, body, image_url, post_type, stats, created_at, profiles(id, display_name, avatar_url), feed_likes(count), feed_comments(count)`).order('created_at', { ascending:false }).limit(20),
      supabase.from('feed_likes').select('post_id').eq('user_id', user.id),
    ]);
    likedIds = (myLikes || []).map(like => like.post_id);
    normalizedPosts = (posts || []).map(post => ({ ...post, like_count: post.feed_likes?.[0]?.count || 0, comment_count: post.feed_comments?.[0]?.count || 0, profiles: post.profiles || { id: post.user_id, display_name:null, avatar_url:null } }));
  }

  return <AppShell><FeedVisualPatch/><div className="feed-mode-shell"><FeedModeTabs/></div>{mode === 'following' ? <div className="screen-pad feed-following-content"><FollowingFeed posts={normalizedPosts} followingCount={followingIds.length}/></div> : <FeedClient posts={normalizedPosts} likedIds={likedIds} userId={user.id} profile={profile || {}} cheerNotifications={cheerNotifications||[]} />}{mode === 'for-you' && <FeedInteractionEnhancer posts={normalizedPosts}/>}</AppShell>;
}
