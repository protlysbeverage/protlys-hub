'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import {normalizeInviteCode} from '@/lib/group-invites';

export default function JoinClient({initialCode=''}) {
 const router=useRouter(),input=useRef(null);
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[vh,setVh]=useState('100dvh'),[dirty,setDirty]=useState(false);
 useEffect(()=>{
  const initial=normalizeInviteCode(initialCode||sessionStorage.getItem('protlys-join-code')||'');setCode(initial);sessionStorage.setItem('protlys-join-code',initial);
  const vv=window.visualViewport,s=()=>setVh((vv?.height||window.innerHeight)+'px');s();vv?.addEventListener('resize',s);vv?.addEventListener('scroll',s);input.current?.focus();
  const pop=()=>router.replace('/challenges');history.pushState({},'',location.href);addEventListener('popstate',pop);
  return()=>{vv?.removeEventListener('resize',s);vv?.removeEventListener('scroll',s);removeEventListener('popstate',pop)};
 },[initialCode,router]);
 async function submit(e){e?.preventDefault();if(code.length!==8||busy)return;setBusy(true);setResult(null);const {data,error}=await createClient().rpc('join_group_by_code',{p_code:code});if(error){setResult({status:'error'});setBusy(false);return}setResult(data);setBusy(false);if(data?.status==='joined'){sessionStorage.removeItem('protlys-join-code');sessionStorage.setItem('protlys-toast','Joined '+data.name);router.replace('/challenges?group='+encodeURIComponent(data.group_id));router.refresh()}}
 const message=result?.status==='not_found'?'Code not found. Check it and try again.':result?.status==='code_disabled'?'This code is no longer active.':result?.status==='group_full'?'This group is full.':result?.status==='rate_limited'?'Too many tries. Try again in '+Math.max(1,Number(result.minutes)||1)+' min.':result?.status==='error'?'Couldn’t join. Check your connection and try again.':result?.status==='already_member'?'You’re already in '+(result.name||'this group')+'.':'';
 const setCodeValue=v=>{const next=normalizeInviteCode(v).slice(0,8);setCode(next);setDirty(next.length>0);setResult(null)};
 return <main className="protlys-fullscreen" style={{height:vh}}>
  <header className="fullscreen-topbar"><button type="button" aria-label="Close" className="fullscreen-close" onClick={()=>router.replace('/challenges')}>×</button><h1>Join with code</h1><span/></header>
  <form className="fullscreen-form" onSubmit={submit}>
   <div className="fullscreen-body join-body">
    <div className="join-intro"><span className="join-icon">🔑</span><h2>Join a group</h2><p>Enter the 8-character code a group member shared with you.</p></div>
    <div className="code-boxes" onClick={()=>input.current?.focus()}>{Array.from({length:8},(_,i)=><div key={i} className={i<code.length?'code-box filled':i===code.length?'code-box active':'code-box'}>{code[i]||''}</div>)}<input ref={input} aria-label="Invite code" inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={8} value={code} onChange={e=>setCodeValue(e.target.value)}/></div>
    <button type="button" className="paste-button" onClick={async()=>{try{setCodeValue(await navigator.clipboard.readText());input.current?.focus()}catch{setResult({status:'error'})}}}>Paste code</button>
    {message&&<div role="status" className={result.status==='already_member'?'join-result success':'join-result'}>{message}{result.status==='already_member'&&<button type="button" className="btn-secondary" onClick={()=>router.replace('/challenges?group='+encodeURIComponent(result.group_id))}>Open group</button>}</div>}
   </div>
   <footer className="fullscreen-footer"><button type="submit" disabled={code.length!==8||busy} className="fullscreen-footer-button">{busy?<><span className="fullscreen-spinner"/>Joining…</>:'Join group'}</button></footer>
  </form>
 </main>
}
