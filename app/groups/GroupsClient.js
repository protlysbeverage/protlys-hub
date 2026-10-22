'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function GroupsClient({ initialGroups=[] }) {
  const [groups,setGroups]=useState(initialGroups);
  const [code,setCode]=useState('');
  const [name,setName]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  async function join(){
    if(!code.trim())return;
    setBusy(true);setMessage('');
    const {data,error}=await createClient().rpc('join_group_by_invite_code',{p_invite_code:code.trim()});
    if(error){setMessage(error.message||'Could not join group.');setBusy(false);return;}
    const {data:group}=await createClient().from('groups').select('id,name,privacy').eq('id',data).single();
    if(group)setGroups(function(prev){return prev.some(function(g){return g.id===group.id;})?prev:prev.concat(group);});
    setCode('');setMessage('Joined group.');setBusy(false);window.dispatchEvent(new Event('protlys:groups-changed'));
  }

  async function createGroup(){
    if(!name.trim())return;
    setBusy(true);setMessage('');
    const supabase=createClient();
    const {data,error}=await supabase.from('groups').insert({name:name.trim(),created_by:(await supabase.auth.getUser()).data.user.id,privacy:'public'}).select('id,name,privacy').single();
    if(error){setMessage(error.message||'Could not create group.');setBusy(false);return;}
    if(data){await supabase.from('group_members').insert({group_id:data.id,user_id:(await supabase.auth.getUser()).data.user.id,role:'admin'});setGroups(function(prev){return prev.concat(data);});}
    setName('');setMessage('Group created.');setBusy(false);window.dispatchEvent(new Event('protlys:groups-changed'));
  }

  return <div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:22,paddingBottom:'calc(112px + env(safe-area-inset-bottom))'}}>
    <span className="eyebrow">Groups</span><h1 style={{fontSize:26,marginTop:5}}>Your groups</h1><p className="subhead">Join a group to compete in the weekly steps leaderboard.</p>
    <section className="hub-card" style={{marginTop:16,padding:16}}>
      <div style={{fontWeight:800,fontSize:15}}>Join with an invite code</div><div style={{display:'flex',gap:8,marginTop:10}}><input value={code} onChange={function(e){setCode(e.target.value.toUpperCase());}} placeholder="INVITE CODE" aria-label="Group invite code" style={{flex:1,minWidth:0,minHeight:44,padding:'10px 12px',border:'1.5px solid var(--line)',borderRadius:12,background:'var(--card)',color:'var(--ink)',font: '800 13px Manrope,sans-serif'}}/><button type="button" className="btn-primary" onClick={join} disabled={busy} style={{margin:0,minHeight:44}}>Join</button></div>
    </section>
    <section className="hub-card" style={{marginTop:10,padding:16}}>
      <div style={{fontWeight:800,fontSize:15}}>Create a group</div><div style={{display:'flex',gap:8,marginTop:10}}><input value={name} onChange={function(e){setName(e.target.value);}} placeholder="Group name" aria-label="New group name" style={{flex:1,minWidth:0,minHeight:44,padding:'10px 12px',border:'1.5px solid var(--line)',borderRadius:12,background:'var(--card)',color:'var(--ink)'}}/><button type="button" className="btn-secondary" onClick={createGroup} disabled={busy} style={{margin:0,minHeight:44}}>Create</button></div>
    </section>
    <section style={{marginTop:16}}><div className="t" style={{fontSize:10}}>MEMBER OF</div>{groups.length?groups.map(function(group){return <div key={group.id} style={{display:'flex',alignItems:'center',gap:12,padding:13,marginTop:8,border:'1.5px solid var(--line)',borderRadius:16,background:'var(--card)'}}><div style={{width:40,height:40,borderRadius:'50%',display:'grid',placeItems:'center',background:'var(--green-soft)',color:'var(--green-dark)',fontWeight:800}}>{String(group.name||'G').slice(0,2).toUpperCase()}</div><strong>{group.name}</strong></div>;}):<div style={{padding:'18px 4px',color:'var(--ink-45)',fontSize:12}}>You are not in a group yet.</div>}</section>
    {message&&<div role="status" style={{marginTop:12,fontSize:12,fontWeight:700,color:'var(--green-dark)'}}>{message}</div>}
  </div>;
}
