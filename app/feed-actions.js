'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createFeedPostAction({ body, postType, stats, imageBase64, imageName, imageType }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  let imageUrl = null;

  if (imageBase64 && imageName) {
    const bytes = Buffer.from(imageBase64, 'base64');
    const ext = imageName.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('feed-images')
      .upload(path, bytes, {
        contentType: imageType || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      return { error: `Photo upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage.from('feed-images').getPublicUrl(path);
    imageUrl = urlData?.publicUrl || null;
  }

  const { error } = await supabase.from('feed_posts').insert({
    user_id: user.id,
    body: body || null,
    image_url: imageUrl,
    post_type: postType || 'general',
    stats: stats || null,
  });

  if (error) return { error: error.message };

  revalidatePath('/');
  return { ok: true };
}

export async function toggleFeedLikeAction({ postId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data: existing, error: lookupError } = await supabase.from('feed_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

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

export async function addFeedCommentAction({ postId, body }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const cleanBody = String(body || '').trim();
  if (!cleanBody) return { error: 'Comment cannot be empty.' };

  const { error } = await supabase.from('feed_comments').insert({
    post_id: postId,
    user_id: user.id,
    body: cleanBody,
  });

  if (error) return { error: error.message };

  revalidatePath('/');
  return { ok: true };
}
