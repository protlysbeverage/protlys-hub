'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function Toggle({label,description,checked,onChange}){return <label style={{display:'flex',justifyContent:'space-between',gap:15,alignItems:'center',padding:'14px 0',borderBottom:'1px solid var(--line)',cursor:'pointer'}}><span><span style={{display:'block',fontSize:13,fontWeight:800}}>{label}</span><span style={{display:'block',fontSize:10.8,color:'var(--ink-45)',marginTop:3,lineHeight:1.35}}>{description}</span></span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/></label>}

export default function SettingsClient({name,bio,email,targetG,joinedAt}){
  const router=useRouter(); const [displayName,setDisplayName]=useState(name); const [about,setAbout]=useState(bio||''); const [pending,startTransition]=useTransition(); const [message,setMessage]=useState('');
  const [daily,setDaily]=useState(false),[evening,setEvening]=useState(false),[weekly,setWeekly]=useState(false); const [deleting,setDeleting]=useState(false);
  useEffect(()=>{try{setDaily(localStorage.getItem('protlys_daily_reminder')==='1');setEvening(localStorage.getItem('protlys_evening_reminder')==='1');setWeekly(localStorage.getItem('protlys_weekly_summary')==='1')}catch{}},[]);
  function saveProfile(){const clean=displayName.trim();if(!clean)return setMessage('Name cannot be empty.');startTransition(async()=>{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return setMessage('Not signed in.');const {error}=await supabase.from('profiles').update({display_name:clean,bio:about.trim()||null}).eq('id',user.id);if(error)return setMessage(error.message);setMessage('Profile updated.');router.refresh();});}
  function pref(key,setter,value){setter(value);try{localStorage.setItem(key,value?'1':'0')}catch{}}
  async function signOut(){const supabase=createClient();await supabase.auth.signOut();router.push('/login');router.refresh();}
  async function deleteAccount(){
    if(deleting)return;
    const confirmed=window.confirm('Permanently delete your Protlys Hub account and associated data? This cannot be undone.');
    if(!confirmed)return;
    const typed=window.prompt('Type DELETE to confirm permanent account deletion.');
    if(typed!=='DELETE')return;
    setDeleting(true);setMessage('');
    const supabase=createClient();
    const {error}=await supabase.rpc('delete_my_protlys_account');
    if(error){setDeleting(false);setMessage(error.message||'Could not delete your account.');return;}
    await supabase.auth.signOut();
    router.replace('/account-deletion?deleted=1');router.refresh();
  }
  const joined=joinedAt?new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',day:'numeric',month:'long',year:'numeric'}).format(new Date(joinedAt)):'—';
  return <div className="screen-pad" style={{maxWidth:600,margin:'0 auto',paddingTop:24}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span className="eyebrow">Account</span><h1 style={{fontSize:25,marginTop:4}}>Settings</h1></div><button className="link-btn" onClick={()=>router.push('/account')}>Back</button></div>
    <section className="section-card" style={{marginTop:17}}><div style={{fontWeight:800,fontSize:16}}>Profile</div><label className="field-label" style={{display:'block',marginTop:15}}>NAME</label><div style={{display:'flex',gap:8,marginTop:6}}><input className="field-input" value={displayName} onChange={e=>setDisplayName(e.target.value)}/></div><label className="field-label" style={{display:'block',marginTop:14}}>ABOUT</label><textarea className="field-input" value={about} onChange={e=>setAbout(e.target.value.slice(0,240))} maxLength={240} rows={4} placeholder="Tell people a little about yourself…" style={{width:'100%',marginTop:6,resize:'vertical',lineHeight:1.45,padding:11,fontFamily:'inherit'}}/><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}><span style={{fontSize:10.5,color:'var(--ink-45)'}}>Shown on your member profile · {about.length}/240</span><button className="btn-primary" style={{width:'auto',margin:0,padding:'10px 14px'}} onClick={saveProfile} disabled={pending}>{pending?'Saving…':'Save profile'}</button></div><div style={{fontSize:11.5,color:'var(--ink-45)',marginTop:12}}>Email</div><div style={{fontSize:13,fontWeight:700,marginTop:3,overflowWrap:'anywhere'}}>{email}</div><div style={{fontSize:11.5,color:'var(--ink-45)',marginTop:12}}>Joined Protlys Hub</div><div style={{fontSize:13,fontWeight:700,marginTop:3}}>{joined}</div>{message&&<div style={{fontSize:11.5,color:message.includes('updated')?'var(--green-dark)':'#B3261E',marginTop:9}}>{message}</div>}</section>
    <section className="section-card" style={{marginTop:12}}><div style={{fontWeight:800,fontSize:16}}>Target & preferences</div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:13,padding:'12px 0'}}><div><div style={{fontSize:13,fontWeight:800}}>Daily protein target</div><div style={{fontSize:10.8,color:'var(--ink-45)',marginTop:3}}>Your current guide</div></div><button className="btn-secondary" style={{margin:0}} onClick={()=>router.push('/hub/goal')}>{targetG} g · Edit</button></div></section>
    <section className="section-card" style={{marginTop:12}}><div style={{fontWeight:800,fontSize:16}}>Notifications</div><Toggle label="Daily reminder" description="A reminder at a time you choose. Notifications stay off until you enable them." checked={daily} onChange={v=>pref('protlys_daily_reminder',setDaily,v)}/><Toggle label="Evening under-target" description="Only useful when you still have protein remaining late in the day." checked={evening} onChange={v=>pref('protlys_evening_reminder',setEvening,v)}/><Toggle label="Weekly summary" description="A simple weekly average and days at target." checked={weekly} onChange={v=>pref('protlys_weekly_summary',setWeekly,v)}/><div style={{fontSize:10.5,color:'var(--ink-45)',paddingTop:11}}>These are preference controls for now; actual push delivery will be connected later.</div></section>
    <section className="section-card" style={{marginTop:12}}><div style={{fontWeight:800,fontSize:16}}>Support & legal</div><div style={{display:'grid',gap:1,marginTop:8}}><a href="/terms" className="list-row" style={{textDecoration:'none',padding:'12px 0'}}>Terms <span>›</span></a><a href="/privacy" className="list-row" style={{textDecoration:'none',padding:'12px 0'}}>Privacy <span>›</span></a><a href="/account-deletion" className="list-row" style={{textDecoration:'none',padding:'12px 0'}}>Account deletion information <span>›</span></a></div><div style={{fontSize:10,color:'var(--ink-45)',marginTop:10}}>Protlys Hub</div></section>
    <section style={{marginTop:14,padding:'15px 0 30px',textAlign:'center'}}><button className="btn-secondary" onClick={signOut}>Log out</button><button type="button" onClick={deleteAccount} disabled={deleting} style={{display:'block',margin:'14px auto 0',border:0,background:'transparent',color:'#B3261E',fontSize:12,fontWeight:800,cursor:deleting?'wait':'pointer'}}>{deleting?'Deleting account…':'Delete my account'}</button><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:8}}>Permanent. Your sign-in and associated Hub data will be deleted.</div></section>
  </div>;
}
