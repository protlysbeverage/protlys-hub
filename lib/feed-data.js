const PAGE_SIZE = 20;

export async function getFeedPage(supabase, userId, offset = 0) {
  if (!userId) {
    return { error: 'Not signed in', posts: [], likedIds: [], hasMore: false, nextOffset: 0 };
  }

  const safeOffset = Math.max(0, Math.min(10000, Math.floor(Number(offset) || 0)));
  const [blockedResult, postsResult] = await Promise.all([
    supabase.from('blocks').select('blocked_id').eq('blocker_id', userId),
    supabase
      .from('feed_posts')
      .select('id,user_id,body,image_url,post_type,stats,created_at,profiles(display_name,avatar_url),feed_likes(count),feed_comments(count)')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(safeOffset, safeOffset + PAGE_SIZE - 1),
  ]);

  if (blockedResult.error) {
    return { error: blockedResult.error.message, posts: [], likedIds: [], hasMore: false, nextOffset: safeOffset };
  }
  if (postsResult.error) {
    return { error: postsResult.error.message, posts: [], likedIds: [], hasMore: false, nextOffset: safeOffset };
  }

  const blockedIds = new Set((blockedResult.data || []).map(row => String(row.blocked_id)));
  const rawPosts = postsResult.data || [];
  const posts = rawPosts.filter(post =>
    String(post.user_id) === String(userId) || !blockedIds.has(String(post.user_id))
  );
  const postIds = posts.map(post => post.id);

  const likesResult = postIds.length
    ? await supabase.from('feed_likes').select('post_id').eq('user_id', userId).in('post_id', postIds)
    : { data: [], error: null };

  if (likesResult.error) {
    return { error: likesResult.error.message, posts: [], likedIds: [], hasMore: false, nextOffset: safeOffset };
  }

  return {
    posts: posts.map(post => ({
      ...post,
      like_count: Number(post.feed_likes?.[0]?.count || 0),
      comment_count: Number(post.feed_comments?.[0]?.count || 0),
    })),
    likedIds: (likesResult.data || []).map(row => row.post_id),
    hasMore: rawPosts.length === PAGE_SIZE,
    nextOffset: safeOffset + rawPosts.length,
  };
}
