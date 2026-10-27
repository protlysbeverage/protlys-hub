'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';

const EMOJIS=['🏃','💪','🥛','🧘','🔥'];
const MORE_EMOJIS=['🌱','⚡','🎯','🏆','🌍','❤️','☀️'];
const normalizeName=v=>v.slice(0,40);

export default function NewGroupClient(){
 const router=useRouter();
 const [name,setName]=useState(''),[privacy,setPrivacy]=useState('public'),[emoji,setEmoji]=useState(''),[photo,setPhoto]=useState(null),[preview,setPreview]=useState(''),[picker,setPicker]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[dirty,setDirty]=useState(false),[vh,setVh]=useState('100dvh');

 useEffect(()=>{
  const vv=window.visualViewport;
  const sync=()=>setVh((vv?.height||window.innerHeight)+'px');
  sync(); vv?.addEventListener('resize',sync); vv?.addEventListener('scroll',sync);
  const pop=()=>{if(dirty&&!window.confirm('Discard this?')){history.pushState({},'',location.href);return}router.replace('/challenges')};
  history.pushState({},'',location.href); addEventListener('popstate',pop);
  return()=>{vv?.removeEventListener('resize',sync);vv?.removeEventListener('scroll',sync);removeEventListener('popstate',pop)};
 },[dirty,router]);

 const valid=name.trim().length>=2&&name.trim().length<=40;
 const close=()=>{if(dirty&&!window.confirm('Discard this?'))return;router.replace('/challenges')};

 async function submit(e){
  e.preventDefault(); if(!valid||busy)return;
  setBusy(true); setError('');
  let createdGroupId=null; const supabase=createClient();
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user)throw new Error('Please sign in again.');
   const {data:g,error:e1}=await supabase.from('groups').insert({name:name.trim(),privacy,created_by:user.id,emoji:emoji||null}).select('id,name').single();
   if(e1)throw e1; createdGroupId=g.id;
   if(photo){
    const ext=(photo.name.split('.').pop()||'jpg').toLowerCase();
    const path=user.id+'/'+g.id+'-'+Date.now()+'.'+ext;
    const up=await supabase.storage.from('group-avatars').upload(path,photo,{upsert:false,contentType:photo.type||'image/jpeg'});
    if(up.error)throw up.error;
    const url=supabase.storage.from('group-avatars').getPublicUrl(path).data.publicUrl;
    const u=await supabase.from('groups').update({image_url:url}).eq('id',g.id); if(u.error)throw u.error;
   }
   const m=await supabase.from('group_members').insert({group_id:g.id,user_id:user.id,role:'admin'}); if(m.error)throw m.error;
   setDirty(false); sessionStorage.setItem('protlys-toast','Group created');
   router.replace('/challenges?group='+encodeURIComponent(g.id)); router.refresh();
  }catch(err){
   if(createdGroupId)await supabase.from('groups').delete().eq('id',createdGroupId);
   setError(err?.message||'We could not create the group. Please try again.'); setBusy(false);
  }
 }

 const choosePhoto=e=>{const f=e.target.files?.[0];if(!f)return;setPhoto(f);setPreview(URL.createObjectURL(f));setEmoji('');setDirty(true);setPicker(false)};
 const chooseEmoji=x=>{setEmoji(x);setPhoto(null);setPreview('');setDirty(true);setPicker(false)};

 return <main className="protlys-fullscreen" style={{height:vh}}>
  <header className="fullscreen-topbar">
   <button type="button" aria-label="Close" className="fullscreen-close" onClick={close}>×</button>
   <h1>New group</h1>
   <button type="submit" form="new-group-form" disabled={!valid||busy} className="fullscreen-create">{busy?<span className="fullscreen-spinner"/>:'Create'}</button>
  </header>
  <form id="new-group-form" className="fullscreen-form" onSubmit={submit}>
   <div className="fullscreen-body">
    <section className="group-identity">
     <button type="button" className="group-avatar-button" aria-label="Choose photo" onClick={()=>setPicker(true)}>
      <span className="group-avatar">{preview?<img src={preview} alt=""/>:emoji||name.trim().charAt(0).toUpperCase()||'G'}</span>
      <span className="group-camera" aria-hidden="true">📷</span>
     </button>
     <button type="button" className="group-avatar-help" onClick={()=>setPicker(true)}>Tap to add a photo, or pick an emoji</button>
     <div className="group-quick-emojis">{EMOJIS.map(x=><button key={x} type="button" className={emoji===x?'emoji-chip selected':'emoji-chip'} aria-pressed={emoji===x} onClick={()=>chooseEmoji(x)}>{x}</button>)}</div>
    </section>

    <div className="fullscreen-section-label">GROUP NAME</div>
    <label className="fullscreen-field">
     <span>Group name</span>
     <input autoFocus value={name} maxLength={40} onChange={e=>{setName(normalizeName(e.target.value));setDirty(true)}} placeholder="Give your group a name"/>
     <em>{name.trim().length}/40</em>
    </label>

    <div className="fullscreen-section-label">WHO CAN JOIN?</div>
    <div className="fullscreen-option-list">
     {[['public','🌍','Public','Anyone can find and join'],['private','🔒','Private','Only people with their invite code']].map(([v,icon,title,desc])=>
      <button key={v} type="button" className={privacy===v?'fullscreen-option selected':'fullscreen-option'} aria-pressed={privacy===v} onClick={()=>{setPrivacy(v);setDirty(true)}}>
       <span className="option-icon">{icon}</span><span className="option-copy"><strong>{title}</strong><small>{desc}</small></span><span className="radio-dot">{privacy===v&&<i/>}</span>
      </button>)}
    </div>

    <div className="fullscreen-info"><span>🔑</span><p>You'll get an invite code to share after creating.</p></div>
    {error&&<div className="fullscreen-error" role="alert">{error}</div>}
   </div>
   <footer className="fullscreen-footer"><button type="submit" disabled={!valid||busy} className="fullscreen-footer-button">{busy?<><span className="fullscreen-spinner"/>Creating group…</>:'Create group'}</button></footer>
  </form>

  {picker&&<div className="fullscreen-modal-backdrop" role="dialog" aria-modal="true" onClick={()=>setPicker(false)}>
   <div className="fullscreen-picker" onClick={e=>e.stopPropagation()}>
    <div className="picker-title-row"><strong>Group image</strong><button type="button" aria-label="Close" onClick={()=>setPicker(false)}>×</button></div>
    <label className="picker-photo-button">Choose photo<input type="file" accept="image/*" onChange={choosePhoto}/></label>
    <div className="picker-label">Pick an emoji</div>
    <div className="picker-emojis">{[...EMOJIS,...MORE_EMOJIS].map(x=><button key={x} type="button" className={emoji===x?'emoji-chip selected':'emoji-chip'} onClick={()=>chooseEmoji(x)}>{x}</button>)}</div>
   </div>
  </div>}
 </main>
}
