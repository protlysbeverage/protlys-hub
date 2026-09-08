'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function getAuthedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  return { supabase, user };
}

export async function createFeedPostAction({ body, postType, stats, imageBase64, imageName, imageType }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  let imageUrl = null;
  if (imageBase64 && imageName) {
    const bytes = Buffer.from(imageBase64, 'base64');
    const ext = imageName.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('feed-images').upload(path, bytes, { contentType: imageType || 'image/jpeg', upsert: false });
    if (uploadError) return { error: `Photo upload failed: ${uploadError.message}` };
    const { data: urlData } = supabase.storage.from('feed-images').getPublicUrl(path);
    imageUrl = urlData?.publicUrl || null;
  }
  const { error } = await supabase.from('feed_posts').insert({ user_id: user.id, body: body || null, image_url: imageUrl, post_type: postType || 'general', stats: stats || null });
  if (error) return { error: error.message };
  revalidatePath('/');
  return { ok: true };
}

export async function updateFeedPostAction({ postId, body, postType, stats, removeImage = false }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  const { data: post, error: lookupError } = await supabase.from('feed_posts').select('id, user_id, image_url').eq('id', postId).single();
  if (lookupError || !post) return { error: 'Post not found.' };
  if (post.user_id !== user.id) return { error: 'You can only edit your own posts.' };
  let imageUrl = post.image_url;
  if (removeImage && imageUrl) {
    const marker = '/feed-images/'; const index = imageUrl.indexOf(marker);
    if (index >= 0) {
      const storagePath = decodeURIComponent(imageUrl.slice(index + marker.length).split('?')[0]);
      const { error: storageError } = await supabase.storage.from('feed-images').remove([storagePath]);
      if (storageError) return { error: `Could not remove photo: ${storageError.message}` };
    }
    imageUrl = null;
  }
  const { error } = await supabase.from('feed_posts').update({ body: body?.trim() || null, post_type: postType || 'general', stats: stats || null, image_url: imageUrl }).eq('id', postId).eq('user_id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/');
  return { ok: true };
}

export async function deleteFeedPostAction({ postId }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  const { data: post, error: lookupError } = await supabase.from('feed_posts').select('id, user_id, image_url').eq('id', postId).single();
  if (lookupError || !post) return { error: 'Post not found.' };
  if (post.user_id !== user.id) return { error: 'You can only delete your own posts.' };
  if (post.image_url) {
    const marker = '/feed-images/'; const index = post.image_url.indexOf(marker);
    if (index >= 0) await supabase.storage.from('feed-images').remove([decodeURIComponent(post.image_url.slice(index + marker.length).split('?')[0])]);
  }
  const { error } = await supabase.from('feed_posts').delete().eq('id', postId).eq('user_id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/');
  return { ok: true };
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

  // Batch comment likes instead of making two database requests per comment.
  // This is a major reduction in database round-trips when a post has many comments.
  const commentIds = comments.map(comment => String(comment.id));
  const { data: likeRows, error: likesError } = await supabase
    .from('feed_comment_likes')
    .select('id, comment_id, user_id')
    .in('comment_id', commentIds);

  // Keep comments readable even if the optional comment-like table has not been migrated yet.
  if (likesError) return { comments: comments.map(comment => ({ ...comment, like_count: 0, liked: false })) };

  const counts = new Map();
  const likedIds = new Set();
  for (const like of likeRows || []) {
    const id = String(like.comment_id);
    counts.set(id, (counts.get(id) || 0) + 1);
    if (String(like.user_id) === String(user.id)) likedIds.add(id);
  }

  return {
    comments: comments.map(comment => ({
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
  revalidatePath('/');
  return { ok: true };
}

export async function addFeedCommentAction({ postId, body, parentCommentId = null }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  const cleanBody = String(body || '').trim();
  if (!cleanBody) return { error: 'Comment cannot be empty.' };

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
