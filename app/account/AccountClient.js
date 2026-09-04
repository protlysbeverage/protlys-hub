'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function Icon({ name, size = 19 }) {
  const paths = {
    steps: <><path d="M8.5 4.5c1.4 2 1.8 4.2.8 6.2-.8 1.7-2.5 2.7-4.1 2.5-1.6-.2-2.5-1.7-1.9-3.1.6-1.4 2-2 3.3-2.7 1.1-.5 1.5-1.4 1.9-2.9Z"/><path d="M15.5 19.5c-1.4-2-1.8-4.2-.8-6.2.8-1.7 2.5-2.7 4.1-2.5 1.6.2 2.5 1.7 1.9 3.1-.6 1.4-2 2-3.3 2.7-1.1.5-1.5 1.4-1.9 2.9Z"/></>,
    challenge: <><path d="M8 4h8l-1 6a3 3 0 0 1-6 0L8 4Z"/><path d="M12 13v5M8 21h8M5 4h3M16 4h3"/></>,
    community: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c.5-3.2 2.5-5 6-5s5.5 1.8 6 5M14.5 15.5c2.5-.2 4.5 1.3 5 3.5"/></>,
    box: <><path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="M4 8v9l8 4 8-4V8M12 12v9"/></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v11H4V7Z"/><circle cx="12" cy="12.5" r="3.2"/></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function normalizeShopUrl(value) {
  const raw = (value || '').trim();
  if (!raw || raw.includes('yourstore.myshopify.com')) return 'https://protlys.myshopify.com';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, '');
}

export default function AccountClient({ profile, achievements = [], shopUrl, email }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const name = profile?.display_name || email || 'Member';
  const avatarUrl = profile?.avatar_url;
  const storeUrl = normalizeShopUrl(shopUrl);
  const ordersUrl = `${storeUrl}/account`;

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMessage('Choose an image file.');
    if (file.size > 5 * 1024 * 1024) return setMessage('Photo must be 5MB or smaller.');
    setUploading(true); setMessage('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `avatars/${user.id}/profile-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('feed-images').upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('feed-images').getPublicUrl(path);
      const { error: profileError } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
      if (profileError) throw profileError;
      setMessage('Profile photo updated.');
      router.refresh();
    } catch (error) { setMessage(error?.message || 'Could not update profile photo.'); }
    finally { setUploading(false); }
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const links = [
    { href: '/movement', label: 'Movement & steps', desc: 'Track movement, goals and progress.', icon: 'steps' },
    { href: '/challenges', label: 'Challenges', desc: 'Join challenges and track completion.', icon: 'challenge' },
    { href: '/', label: 'Community', desc: 'See the progress feed and share with the Hub.', icon: 'community' },
    { href: ordersUrl, label: 'Manage Protlys orders', desc: 'View orders and manage your store account.', icon: 'box', external: true },
  ];

  const statCards = [
    ['Protein streak', `${profile?.streak || 0}d`],
    ['Lifetime steps', (profile?.total_steps || 0).toLocaleString()],
    ['Step streak', `${profile?.step_streak || 0}d`],
    ['Daily goal', (profile?.step_goal || 0).toLocaleString()],
  ];

  return <>
    <div className="screen-pad">
      <span className="eyebrow">Dashboard</span>
      <h1 style={{fontSize:24,marginBottom:4}}>Your Protlys dashboard</h1>
      <p className="subhead">Your progress, milestones and Hub shortcuts in one place.</p>

      <div style={{display:'flex',alignItems:'center',gap:13,marginTop:16,background:'#fff',border:'1.5px solid var(--line)',borderRadius:16,padding:14}}>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Change profile photo" style={{width:58,height:58,borderRadius:'50%',background:'var(--green-soft)',border:0,padding:0,overflow:'hidden',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--green-dark)',flexShrink:0,cursor:'pointer'}}>
          {avatarUrl ? <img src={avatarUrl} alt="Profile" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <span style={{fontSize:20,fontWeight:800}}>{name[0].toUpperCase()}</span>}
          <span style={{position:'absolute',right:0,bottom:0,width:20,height:20,borderRadius:'50%',background:'var(--ink)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff'}}><Icon name="camera" size={10}/></span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}} />
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontWeight:800,fontSize:16}}>{name}</div>
          <div style={{fontSize:12,color:'var(--ink-45)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{email}</div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{marginTop:5,padding:0,border:0,background:'none',color:'var(--green-dark)',fontSize:11.5,fontWeight:800,cursor:'pointer'}}>{uploading ? 'Uploading…' : avatarUrl ? 'Change profile photo' : 'Add profile photo'}</button>
          {message && <div style={{fontSize:10.5,color:message.includes('updated')?'var(--green-dark)':'#B3261E',marginTop:3}}>{message}</div>}
        </div>
      </div>
    </div>

    <div className="screen-pad" style={{paddingTop:4}}>
      <div className="hub-grid" style={{marginBottom:20}}>
        {statCards.map(([label, value]) => (
          <div className="hub-card" key={label} style={{minHeight:78,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'flex-start',padding:'11px 12px'}}>
            <div className="t" style={{fontSize:9.5,lineHeight:1.15,marginBottom:5,whiteSpace:'nowrap'}}>{label}</div>
            <div className="mono" style={{fontSize:16,fontWeight:800,lineHeight:1.1,whiteSpace:'nowrap'}}>{value}</div>
          </div>
        ))}
      </div>

      {achievements.length > 0 && <div style={{marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:9}}>Milestones</div>
        <div style={{display:'flex',gap:9,overflowX:'auto',paddingBottom:4}}>
          {achievements.slice(0,8).map((a,i) => <div key={a.id || i} style={{minWidth:112,background:'#fff',border:'1px solid var(--line)',borderRadius:14,padding:12}}><div style={{width:30,height:30,borderRadius:9,background:'var(--green-soft)',color:'var(--green-dark)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>{i+1}</div><div style={{fontSize:11,fontWeight:800,marginTop:8,lineHeight:1.3}}>{a?.achievements?.name || 'Milestone'}</div></div>)}
        </div>
      </div>}

      <div style={{fontWeight:800,fontSize:14,marginBottom:9}}>Your Hub</div>
      <div style={{border:'1.5px solid var(--line)',borderRadius:16,overflow:'hidden',background:'#fff'}}>
        {links.map((item,index) => <a key={item.label} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined} style={{display:'block',textDecoration:'none',borderBottom:index===links.length-1?'none':'1px solid var(--line)'}}>
          <div className="list-row" style={{padding:'15px'}}><div className="left" style={{display:'flex',alignItems:'center',gap:12}}><span style={{color:'var(--green-dark)',display:'flex'}}><Icon name={item.icon}/></span><div><div className="lbl">{item.label}</div><div style={{fontSize:11.5,color:'var(--ink-45)',marginTop:2}}>{item.desc}</div></div></div><svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg></div>
        </a>)}
      </div>

      <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',marginTop:16}}>Return to Protlys store</a>

      <div style={{marginTop:24,paddingTop:18,borderTop:'1px solid var(--line)',textAlign:'center'}}>
        {!confirmSignOut ? <button type="button" onClick={() => setConfirmSignOut(true)} style={{background:'none',border:0,color:'var(--ink-45)',fontSize:13,fontWeight:700,cursor:'pointer'}}>Sign out</button> : <div style={{background:'#FEE2E2',borderRadius:14,padding:15}}><div style={{fontSize:13,color:'#B3261E',fontWeight:700,marginBottom:11}}>Sign out of Protlys Hub?</div><div style={{display:'flex',gap:9}}><button type="button" className="btn-secondary" style={{flex:1,marginTop:0}} onClick={() => setConfirmSignOut(false)}>Cancel</button><button type="button" disabled={signingOut} onClick={handleSignOut} style={{flex:1,border:0,borderRadius:12,padding:12,background:'#B3261E',color:'#fff',fontWeight:800,cursor:'pointer'}}>{signingOut?'Signing out…':'Sign out'}</button></div></div>}
      </div>
    </div>
  </>;
}
