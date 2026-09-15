'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function getAuthedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getFollowStateAction({ profileId }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  const [{ count: followers }, { count: following }, { data: row }] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileId),
    supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', profileId).maybeSingle(),
  ]);
  return { followers: followers || 0, following: following || 0, isFollowing: Boolean(row) };
}

export async function toggleFollowAction({ profileId }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  if (!profileId || String(profileId) === String(user.id)) return { error: 'You cannot follow yourself.' };

  const { data: existing, error: lookupError } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', profileId).maybeSingle();
  if (lookupError) return { error: lookupError.message };

  if (existing) {
    const { error } = await supabase.from('follows').delete().eq('id', existing.id);
    if (error) return { error: error.message };
    revalidatePath(`/member/${profileId}`);
    return { ok: true, following: false };
  }

  const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: profileId });
  if (error) return { error: error.message };
  revalidatePath(`/member/${profileId}`);
  return { ok: true, following: true };
}

export async function getConnectionListAction({ profileId, type }) {
  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Not signed in' };
  const column = type === 'followers' ? 'following_id' : 'follower_id';
  const personColumn = type === 'followers' ? 'follower_id' : 'following_id';
  const { data: rows, error } = await supabase.from('follows').select(`${personColumn}, created_at`).eq(column, profileId).order('created_at', { ascending: false });
  if (error) return { error: error.message };
  const ids = (rows || []).map(row => row[personColumn]).filter(Boolean);
  const { data: profiles, error: profilesError } = ids.length ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids) : { data: [], error: null };
  if (profilesError) return { error: profilesError.message };
  const byId = new Map((profiles || []).map(profile => [String(profile.id), profile]));
  return { people: ids.map(id => ({ ...byId.get(String(id)), followed_at: rows.find(row => String(row[personColumn]) === String(id))?.created_at })).filter(person => person.id) };
}
