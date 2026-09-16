import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request, { params }) {
  const { id } = await params;
  const type = new URL(request.url).searchParams.get('type') === 'following' ? 'following' : 'followers';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:'Unauthorized' }, { status:401 });

  const column = type === 'followers' ? 'following_id' : 'follower_id';
  const personColumn = type === 'followers' ? 'follower_id' : 'following_id';
  const { data: rows, error } = await supabase
    .from('follows')
    .select(`${personColumn}, created_at`)
    .eq(column, id)
    .order('created_at', { ascending:false });
  if (error) return NextResponse.json({ error:'Unable to load connections' }, { status:500 });

  const ids = (rows || []).map(row => row[personColumn]).filter(Boolean);
  if (!ids.length) return NextResponse.json({ people:[] });

  const [{ data: people }, { data: myFollowing }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids),
    supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', ids),
  ]);
  const peopleById = new Map((people || []).map(person => [String(person.id), person]));
  const followingSet = new Set((myFollowing || []).map(row => String(row.following_id)));
  const ordered = ids.map(personId => peopleById.get(String(personId))).filter(Boolean).map(person => ({
    ...person,
    following: followingSet.has(String(person.id)),
  }));

  return NextResponse.json({ people:ordered });
}
