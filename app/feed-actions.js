'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createFeedPostAction({ body, postType, stats, imageBase64, imageName, imageType }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  let imageUrl = null;

  // Upload photo to Supabase Storage if provided
  if (imageBase64 && imageName) {
    const bytes = Buffer.from(imageBase64, 'base64');
    const ext   = imageName.split('.').pop() || 'jpg';
    const path  = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('feed-images')
      .upload(path, bytes, { contentType: imageType || 'image/jpeg', upsert: false });

    if (uploadError) return { error: 'Photo upload failed: ' + uploadError.message };

    const { data: urlData } = supabase.storage.from('feed-images').getPublicUrl(path);
    imageUrl = urlData?.publicUrl || null;
  }

  const { error } = await supabase.from('feed_posts').insert({
    user_id: user.id, body: body || null,
    image_url: imageUrl, post_type: postType || 'general',
    stats: stats || null,
  });

  if (error) return { error: error.message };

  // Award points for posting
  await supabase.from('user_points').insert({ user_id: user.id, points: 2, reason: 'feed_post' });
  await supabase.from('profiles').update({ points: supabase.rpc('increment_points', { uid: user.id, amt: 2 }) }).eq('id', user.id);

  revalidatePath('/');
  return { ok: true };
}

export async function toggleFeedLikeAction({ postId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data: existing } = await supabase.from('feed_likes')
    .select('id').eq('post_id', postId).eq('user_id', user.id).single();

  if (existing) {
    await supabase.from('feed_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('feed_likes').insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath('/');
  return { ok: true };
}

export async function addFeedCommentAction({ postId, body }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  await supabase.from('feed_comments').insert({ post_id: postId, user_id: user.id, body });
  revalidatePath('/');
  return { ok: true };
}
