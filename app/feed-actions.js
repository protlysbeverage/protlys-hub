'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { applyMovementDelta, dateFromTimestamp, extractStepCount } from '@/lib/movement-sync';
import { getFeedPage } from '@/lib/feed-data';

async function getAuthedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  return { supabase, user };
}

export async function createFeedPostAction({ body, postType, stats, imageBase64, imageName, imageType }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error:'Not signed in' };
  const rawBody = typeof body === 'string' ? body.trim() : '';
  if (!rawBody && !imageBase64) return { error:'Add a caption or photo before posting.' };
  if (rawBody.length > 2000) return { error:'Keep your caption under 2,000 characters.' };

  const allowedTypes = new Set(['progress','run','workout','milestone','general']);
  const safePostType = allowedTypes.has(postType) ? postType : 'general';
  let imageUrl = null;
  let storagePath = null;
  if (imageBase64) {
    if (typeof imageBase64 !== 'string' || imageBase64.length > 12 * 1024 * 1024 || !imageName) {
      return { error:'That photo is too large or could not be read. Choose a smaller image.' };
    }
    const mimeTypes = new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]);
    const safeMime = mimeTypes.has(imageType) ? imageType : 'image/jpeg';
    const bytes = Buffer.from(imageBase64, 'base64');
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) return { error:'Photos must be 8MB or smaller.' };
    storagePath = user.id + '/' + Date.now() + '.' + mimeTypes.get(safeMime);
    const { error:uploadError } = await supabase.storage.from('feed-images').upload(storagePath, bytes, { contentType:safeMime, upsert:false });
    if (uploadError) return { error:'Photo upload failed: ' + uploadError.message };
    const { data:urlData } = supabase.storage.from('feed-images').getPublicUrl(storagePath);
    imageUrl = urlData?.publicUrl || null;
  }

  const { data:createdPost, error } = await supabase.from('feed_posts')
    .insert({ user_id:user.id, body:rawBody || null, image_url:imageUrl, post_type:safePostType, stats:stats || null })
    .select('id,created_at').single();
  if (error) {
    if (storagePath) { try { await supabase.storage.from('feed-images').remove([storagePath]); } catch {} }
    return { error:error.message };
  }

  let warning = null;
  const steps = extractStepCount(stats);
  if (steps > 0) {
    const movement = await applyMovementDelta({
      supabase, userId:user.id, stepDate:dateFromTimestamp(createdPost.created_at),
      delta:steps, source:'feed', syncedAt:createdPost.created_at,
    });
    if (movement?.error) warning = 'Post published, but its movement total could not be updated. Refresh Movement to check it.';
  }

  revalidatePath('/'); revalidatePath('/feed'); revalidatePath('/movement'); revalidatePath('/member/' + user.id);
  return { ok:true, warning };
}

export async function updateFeedPostAction({ postId, body, postType, stats, removeImage = false }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error:'Not signed in' };
  const { data:post, error:lookupError } = await supabase.from('feed_posts')
    .select('id,user_id,image_url,stats,created_at').eq('id',postId).single();
  if (lookupError || !post) return { error:'Post not found.' };
  if (post.user_id !== user.id) return { error:'You can only edit your own posts.' };

  const rawBody = typeof body === 'string' ? body.trim() : '';
  if (rawBody.length > 2000) return { error:'Keep your caption under 2,000 characters.' };
  const allowedTypes = new Set(['progress','run','workout','milestone','general']);
  const safePostType = allowedTypes.has(postType) ? postType : 'general';
  let imageUrl = post.image_url;
  let oldStoragePath = null;
  if (removeImage && imageUrl) {
    const marker = '/feed-images/';
    const index = imageUrl.indexOf(marker);
    if (index >= 0) oldStoragePath = decodeURIComponent(imageUrl.slice(index + marker.length).split('?')[0]);
    imageUrl = null;
  }

  const { data:updatedPost, error } = await supabase.from('feed_posts')
    .update({ body:rawBody || null, post_type:safePostType, stats:stats || null, image_url:imageUrl })
    .eq('id',postId).eq('user_id',user.id).select('id').maybeSingle();
  if (error) return { error:error.message };
  if (!updatedPost) return { error:'Post could not be updated. Refresh and try again.' };

  let warning = null;
  if (oldStoragePath) {
    const { error:storageError } = await supabase.storage.from('feed-images').remove([oldStoragePath]);
    if (storageError) warning = 'Post updated, but its old photo could not be removed from storage.';
  }

  const oldSteps = extractStepCount(post.stats);
  const newSteps = extractStepCount(stats);
  const delta = newSteps - oldSteps;
  if (delta !== 0) {
    const movement = await applyMovementDelta({
      supabase, userId:user.id, stepDate:dateFromTimestamp(post.created_at),
      delta, source:'feed', syncedAt:post.created_at,
    });
    if (movement?.error) warning = 'Post updated, but its movement total could not be updated. Refresh Movement to check it.';
  }

  revalidatePath('/'); revalidatePath('/feed'); revalidatePath('/movement'); revalidatePath('/member/' + user.id);
  return { ok:true, warning };
}

export async function deleteFeedPostAction({ postId }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error:'Not signed in' };
  const { data:post, error:lookupError } = await supabase.from('feed_posts')
    .select('id,user_id,image_url,stats,created_at').eq('id',postId).single();
  if (lookupError || !post) return { error:'Post not found.' };
  if (post.user_id !== user.id) return { error:'You can only delete your own posts.' };

  const { data:deleted, error } = await supabase.from('feed_posts').delete()
    .eq('id',postId).eq('user_id',user.id).select('id').maybeSingle();
  if (error) return { error:error.message };
  if (!deleted) return { error:'Post could not be deleted. Refresh and try again.' };

  let warning = null;
  if (post.image_url) {
    const marker = '/feed-images/';
    const index = post.image_url.indexOf(marker);
    if (index >= 0) {
      const storagePath = decodeURIComponent(post.image_url.slice(index + marker.length).split('?')[0]);
      const { error:storageError } = await supabase.storage.from('feed-images').remove([storagePath]);
      if (storageError) warning = 'Post deleted, but its photo could not be removed from storage.';
    }
  }

  const steps = extractStepCount(post.stats);
  if (steps > 0) {
    const movement = await applyMovementDelta({
      supabase, userId:user.id, stepDate:dateFromTimestamp(post.created_at),
      delta:-steps, source:'feed', syncedAt:post.created_at,
    });
    if (movement?.error) warning = 'Post deleted, but its movement total could not be updated. Refresh Movement to check it.';
  }

  revalidatePath('/'); revalidatePath('/feed'); revalidatePath('/movement'); revalidatePath('/member/' + user.id);
  return { ok:true, warning };
}

export async function getFeedCommentsAction({ postId }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };

  let data;
  let error;
  const withReplies = await supabase.from('feed_comments').select('id, post_id, user_id, body, created_at, parent_comment_id, profiles(display_name, avatar_url)').eq('post_id', postId).order('created_at', { ascending: true });
  data = withReplies.data;
  error = withReplies.error;

  if (error && /parent_comment_id|column/i.test(error.message || '')) {
    const fallback = await supabase.from('feed_comments').select('id, post_id, user_id, body, created_at, profiles(display_name, avatar_url)').eq('post_id', postId).order('created_at', { ascending: true });
    data = (fallback.data || []).map(comment => ({ ...comment, parent_comment_id: null }));
    error = fallback.error;
  }
  if (error) return { error: error.message };

  const comments = data || [];
  if (!comments.length) return { comments: [] };
  const { data: blockedRows } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id);
  const blockedIds = new Set((blockedRows || []).map(row => String(row.blocked_id)));
  const visibleComments = comments.filter(comment => !blockedIds.has(String(comment.user_id)));
  if (!visibleComments.length) return { comments: [] };

  // Batch comment likes instead of making two database requests per comment.
  const commentIds = visibleComments.map(comment => String(comment.id));
  const { data: likeRows, error: likesError } = await supabase
    .from('feed_comment_likes')
    .select('id, comment_id, user_id')
    .in('comment_id', commentIds);

  // Keep comments readable even if the optional comment-like table has not been migrated yet.
  if (likesError) return { comments: visibleComments.map(comment => ({ ...comment, like_count: 0, liked: false })) };

  const counts = new Map();
  const likedIds = new Set();
  for (const like of likeRows || []) {
    const id = String(like.comment_id);
    counts.set(id, (counts.get(id) || 0) + 1);
    if (String(like.user_id) === String(user.id)) likedIds.add(id);
  }

  return {
    comments: visibleComments.map(comment => ({
      ...comment,
      like_count: counts.get(String(comment.id)) || 0,
      liked: likedIds.has(String(comment.id)),
    })),
  };
}

export async function getFeedLikeStateAction({ postId }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  const { data, error } = await supabase.from('feed_likes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
  if (error) return { error: error.message };
  return { liked: Boolean(data) };
}

export async function toggleFeedLikeAction({ postId }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  const { data: existing, error: lookupError } = await supabase.from('feed_likes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (existing) {
    const { error } = await supabase.from('feed_likes').delete().eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('feed_likes').insert({ post_id: postId, user_id: user.id });
    if (error) return { error: error.message };
  }
  revalidatePath('/'); revalidatePath('/feed');
  return { ok: true };
}

export async function deleteFeedCommentAction({ commentId }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error:'Not signed in' };
  const id = String(commentId || '').trim();
  if (!id || id.length > 80) return { error:'Comment not found.' };
  const { data:comment, error:lookupError } = await supabase.from('feed_comments')
    .select('id,user_id,post_id').eq('id',id).maybeSingle();
  if (lookupError || !comment) return { error:'Comment not found.' };
  if (String(comment.user_id) !== String(user.id)) return { error:'You can only delete your own comments.' };
  const { data:deleted, error } = await supabase.from('feed_comments').delete()
    .eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
  if (error) return { error:error.message };
  if (!deleted) return { error:'Comment could not be deleted. Refresh and try again.' };
  revalidatePath('/'); revalidatePath('/feed');
  return { ok:true };
}

export async function addFeedCommentAction({ postId, body, parentCommentId = null }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  const cleanBody = String(body || '').trim();
  if (!cleanBody) return { error: 'Comment cannot be empty.' };
  if (cleanBody.length > 1000) return { error:'Keep comments under 1,000 characters.' };

  const payload = { post_id: postId, user_id: user.id, body: cleanBody };
  if (parentCommentId) payload.parent_comment_id = String(parentCommentId);
  let result = await supabase.from('feed_comments').insert(payload);
  if (result.error && parentCommentId && /parent_comment_id|column/i.test(result.error.message || '')) {
    result = await supabase.from('feed_comments').insert({ post_id: postId, user_id: user.id, body: cleanBody });
  }
  if (result.error) return { error: result.error.message };
  revalidatePath('/');
  return { ok: true };
}

export async function toggleFeedCommentLikeAction({ commentId }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  const id = String(commentId || '').trim();
  if (!id) return { error: 'Comment not found.' };
  const { data: existing, error: lookupError } = await supabase.from('feed_comment_likes').select('id').eq('comment_id', id).eq('user_id', user.id).maybeSingle();
  if (lookupError) return { error: 'Comment likes are not enabled yet. Run migration 011 in Supabase.' };
  if (existing) {
    const { error } = await supabase.from('feed_comment_likes').delete().eq('id', existing.id);
    if (error) return { error: error.message };
    return { ok: true, liked: false };
  }
  const { error } = await supabase.from('feed_comment_likes').insert({ comment_id: id, user_id: user.id });
  if (error) return { error: error.message };
  return { ok: true, liked: true };
}


export async function getMoreFeedPostsAction({ offset = 0 } = {}) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  return getFeedPage(supabase, user.id, offset);
}


export async function getFeedPageAction() {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  const profileQuery = supabase.from('profiles').select('id,display_name,avatar_url').eq('id', user.id).maybeSingle();
  let profileTimer;
  const [feed, profileResult] = await Promise.all([
    getFeedPage(supabase, user.id, 0),
    Promise.race([
      Promise.resolve(profileQuery),
      new Promise(resolve => { profileTimer = setTimeout(() => resolve({ data: null, error: { message: 'Profile request timed out after 8 seconds' } }), 8000); }),
    ]).finally(() => clearTimeout(profileTimer)),
  ]);
  return {
    ...feed,
    profile: profileResult.data || null,
    error: feed.error || null,
  };
}
