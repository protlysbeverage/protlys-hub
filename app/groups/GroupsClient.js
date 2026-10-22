'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function initials(name){return String(name||'Founding 250').trim().split(/\s+/).map(function(p){return p[0];}).join('').slice(0,2).toUpperCase();}

export default function GroupsClient() {
  const [group,setGroup]=useState(null);
  const [memberCount,setMemberCount]=useState(0);
  const [loading,setLoading]=useState(true);

  useEffect(function(){
    let cancelled=false;
    async function load(){
      const supabase=createClient();
      const {data}=await supabase.from('groups').select('id,name').eq('is_system',true).eq('name','Founding 250').maybeSingle();
      if(cancelled)return;
      if(!data){setLoading(false);return;}
      const {count}=await supabase.from('group_members').select('user_id',{count:'exact',head:true}).eq('group_id',data.id);
      if(cancelled)return;
      setGroup(data);
      setMemberCount(Number(count||0));
      setLoading(false);
    }
    load();
    return function(){cancelled=true;};
  },[]);

  return <div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:22,paddingBottom:'calc(112px + env(safe-area-inset-bottom))'}}>
    <span className="eyebrow">Groups</span>
    <h1 style={{fontSize:26,marginTop:5}}>Your community</h1>
    <p className="subhead">Everyone starts together in the Protlys founding community.</p>

    <section className="hub-card" style={{marginTop:16,padding:18,cursor:group?'pointer':'default'}} onClick={function(){ if(group) window.location.href='/movement?tab=leaderboard'; }}>
      {loading ? <div style={{display:'grid',gap:10}}><div style={{height:16,width:'45%',borderRadius:999,background:'var(--green-soft)'}}/><div style={{height:12,width:'70%',borderRadius:999,background:'var(--green-soft)'}}/></div> :
      group ? <div style={{display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:52,height:52,borderRadius:'50%',display:'grid',placeItems:'center',background:'var(--green-soft)',color:'var(--green-dark)',fontWeight:900,fontSize:15,flex:'0 0 52px'}}>{initials(group.name)}</div>
        <div style={{minWidth:0,flex:1}}>
          <div className="t" style={{fontSize:10}}>FOUNDING COMMUNITY</div>
          <div style={{fontSize:19,fontWeight:800,marginTop:3}}>Founding 250</div>
          <div style={{fontSize:11.5,color:'var(--ink-45)',marginTop:4}}>{memberCount} / 250 members · weekly steps leaderboard</div>
        </div>
        <span aria-hidden="true" style={{fontSize:25,color:'var(--ink-45)'}}>›</span>
      </div> :
      <div style={{fontSize:13,fontWeight:700}}>Founding 250 is being prepared.</div>}
    </section>
  </div>;
}