import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import FollowButton from '@/components/FollowButton';

function Avatar({ name, url }) {
  const style = { width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 };
  if (url) return <img src={url} alt="" style={style} />;
  return <div style={{ ...style, background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--green-dark)' }}>{(name || '?')[0].toUpperCase()}</div>;
}

export default async function ConnectionsPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const type = query?.type === 'following' ? 'following' : 'followers';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('id, display_name').eq('id', id).maybeSingle();
  if (!profile) notFound();

  const column = type === 'followers' ? 'following_id' : 'follower_id';
  const personColumn = type === 'followers' ? 'follower_id' : 'following_id';
  const { data: rows } = await supabase.from('follows').select(`${personColumn}, created_at`).eq(column, id).order('created_at', { ascending: false });
  const ids = (rows || []).map(row => row[personColumn]).filter(Boolean);
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids) : { data: [] };
  const peopleById = new Map((people || []).map(person => [String(person.id), person]));
  const orderedPeople = ids.map(personId => peopleById.get(String(personId))).filter(Boolean);

  const { data: myFollowing } = ids.length ? await supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', ids) : { data: [] };
  const followingSet = new Set((myFollowing || []).map(row => String(row.following_id)));

  const title = type === 'followers' ? 'Followers' : 'Following';
  return <AppShell><div className="screen-pad" style={{ paddingTop: 18 }}>
    <Link href={`/member/${id}`} style={{ color:'var(--ink-70)', textDecoration:'none', fontSize:12, fontWeight:800 }}>← Back to profile</Link>
    <div style={{ marginTop:18 }}>
      <div className="eyebrow">{profile.display_name || 'Protlys Member'}</div>
      <h1 style={{ fontSize:24, margin:'4px 0 14px' }}>{title}</h1>
      <div style={{ display:'flex', gap:7, borderBottom:'1px solid var(--line)', marginBottom:12 }}>
        <Link href={`/member/${id}/connections?type=followers`} style={{ padding:'9px 12px', textDecoration:'none', color:type === 'followers' ? 'var(--green-dark)' : 'var(--ink-45)', fontWeight:800, fontSize:12, borderBottom:type === 'followers' ? '2px solid var(--green)' : '2px solid transparent' }}>Followers</Link>
        <Link href={`/member/${id}/connections?type=following`} style={{ padding:'9px 12px', textDecoration:'none', color:type === 'following' ? 'var(--green-dark)' : 'var(--ink-45)', fontWeight:800, fontSize:12, borderBottom:type === 'following' ? '2px solid var(--green)' : '2px solid transparent' }}>Following</Link>
      </div>
      {orderedPeople.length ? <div style={{ display:'grid', gap:8 }}>{orderedPeople.map(person => <div key={person.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 0', borderBottom:'1px solid var(--line)' }}><Link href={`/member/${person.id}`} style={{ display:'flex', alignItems:'center', gap:11, flex:1, minWidth:0, textDecoration:'none', color:'var(--ink)' }}><Avatar name={person.display_name} url={person.avatar_url} /><span style={{ fontSize:13, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{person.display_name || 'Protlys Member'}</span></Link>{String(person.id) !== String(user.id) && <FollowButton profileId={person.id} initialFollowing={followingSet.has(String(person.id))} compact />}</div>)}</div> : <div style={{ background:'#fff', border:'1.5px solid var(--line)', borderRadius:16, padding:'28px 18px', textAlign:'center' }}><div style={{ fontWeight:800 }}>No {title.toLowerCase()} yet</div><p className="subhead" style={{ margin:'5px 0 0' }}>People who connect with this profile will appear here.</p></div>}
    </div>
  </div></AppShell>;
}
