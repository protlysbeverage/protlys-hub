'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import PostShareCard from './PostShareCard';

const THEMES=['dark','light','surface'];
const LABELS={dark:'Dark',light:'Light',surface:'Surface'};

async function assetDataUrl(path){
  const r=await fetch(path,{cache:'force-cache'});
  if(!r.ok) throw new Error('Unable to load '+path);
  const blob=await r.blob();
  return await new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.onerror=reject;f.readAsDataURL(blob)});
}
async function waitImages(node){
  await Promise.all([...node.querySelectorAll('img')].map(async img=>{
    if(img.decode) try{await img.decode();return}catch{}
    if(img.complete)return;
    await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})});
  }));
}
function publicUrl(postId){
  return `https://hub.protlys.com/p/${postId}?utm_source=share&utm_medium=card&utm_campaign=post`;
}

export default function PostShareSheet({open,onClose,post,replies=[],currentUserId=null}){
  const [mounted,setMounted]=useState(false);
  const [theme,setTheme]=useState('dark');
  const [layout,setLayout]=useState('post');
  const [size,setSize]=useState('standard');
  const [showAvatar,setShowAvatar]=useState(false);
  const [assets,setAssets]=useState({});
  const [shareReplies,setShareReplies]=useState(replies||[]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [cardHeight,setCardHeight]=useState(0);
  const previewRef=useRef(null);
  const cardRef=useRef(null);

  const isAuthor=Boolean(currentUserId&&post?.user_id&&String(currentUserId)===String(post.user_id));

  useEffect(()=>setMounted(true),[]);
  useEffect(()=>{
    if(!open)return;
    setTheme(document.documentElement.dataset.theme==='dark'?'dark':'light');
    setLayout('post');setSize('standard');setShowAvatar(false);setBusy(false);setMessage('');setShareReplies(replies||[]);
    fetch(`/api/posts/${post.id}/share`).then(r=>r.ok?r.json():Promise.reject(new Error('share data failed'))).then(data=>setShareReplies(data.comments||[])).catch(()=>{});
    (async()=>{
      try{
        const [dark,light,qr]=await Promise.all([
          assetDataUrl('/protlys-logo-dark.png'),
          assetDataUrl('/protlys-logo-exact.png'),
          QRCode.toDataURL(publicUrl(post.id),{margin:1,width:220,errorCorrectionLevel:'M',color:{dark:'#111111',light:'#FFFFFF'}})
        ]);
        setAssets({dark,light,surface:dark,qr});
      }catch(e){console.error('[Protlys Post Share]',e);setMessage('Some share assets could not be loaded.')}
    })();
    const old=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=old};
  },[open,post?.id]);

  useEffect(()=>{
    if(!open)return;
    const measure=()=>{
      const node=cardRef.current?.querySelector('[data-protlys-post-card="true"]');
      if(node)setCardHeight(Math.ceil(node.getBoundingClientRect().height));
    };
    measure();
    const raf=requestAnimationFrame(measure);
    const ro=typeof ResizeObserver!=='undefined'&&cardRef.current?new ResizeObserver(measure):null;
    ro?.observe(cardRef.current);
    return()=>{cancelAnimationFrame(raf);ro?.disconnect()};
  },[open,theme,layout,size,showAvatar,assets,replies]);

  const availableHeight=()=>Math.max(180,(window.innerHeight-56-48-124-24));
  const scale=typeof window==='undefined'?1:Math.max(0.3,Math.min(1,(window.innerWidth-32)/360,availableHeight()/(Math.max(cardHeight,1))));
  
  async function exportBlob(){
    const source=cardRef.current?.querySelector('[data-protlys-post-card="true"]');
    if(!source)throw new Error('Post card is not mounted.');
    const holder=document.createElement('div');
    holder.style.cssText='position:fixed;left:-30000px;top:0;width:360px;overflow:hidden;pointer-events:none;opacity:1;';
    const clone=source.cloneNode(true);
    clone.style.transform='none';clone.style.width='360px';clone.style.maxWidth='360px';
    holder.appendChild(clone);document.body.appendChild(holder);
    try{
      await document.fonts?.ready;await waitImages(clone);
      const measured=Math.ceil(clone.getBoundingClientRect().height);
      const height=Math.min(1600,Math.max(1,measured));
      const dataUrl=await toPng(clone,{cacheBust:true,pixelRatio:3,width:360,height,style:{width:'360px',transform:'none'}});
      const blob=await (await fetch(dataUrl)).blob();
      return blob;
    }finally{holder.remove()}
  }
  async function share(){
    if(busy)return;setBusy(true);setMessage('');
    try{
      const blob=await exportBlob();const file=new File([blob],'protlys-post-card.png',{type:'image/png'});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({files:[file],title:'Protlys post'});
      else{const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='protlys-post-card.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
    }catch(e){if(e?.name!=='AbortError')setMessage('Could not share the card.')}finally{setBusy(false)}
  }
  async function save(){
    if(busy)return;setBusy(true);setMessage('');
    try{const blob=await exportBlob();const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='protlys-post-card.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);setMessage('Image saved.')}catch{setMessage('Could not save the card.')}finally{setBusy(false)}
  }
  async function copyLink(){
    try{await navigator.clipboard.writeText(publicUrl(post.id));setMessage('Link copied.')}catch{setMessage('Could not copy the link.')}
  }
  if(!open||!mounted)return null;
  const previewStyle={width:360*scale,height:cardHeight*scale,position:'relative',flex:'0 0 auto'};
  const themeIsDark=document.documentElement.dataset.theme==='dark';
  return createPortal(<div style={{position:'fixed',inset:0,zIndex:2147483000,fontFamily:'Manrope,sans-serif'}}>
    <div aria-hidden="true" onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.62)'}}/>
    <section role="dialog" aria-modal="true" aria-label="Share post" style={{position:'absolute',inset:0,height:'100dvh',padding:'max(env(safe-area-inset-top),10px) 16px calc(8px + env(safe-area-inset-bottom))',boxSizing:'border-box',background:themeIsDark?'#121513':'#F7F8F6',color:themeIsDark?'#fff':'#111',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{height:52,flex:'0 0 52px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:20}}>
        <div><div style={{fontSize:18,fontWeight:900}}>Share post</div><div style={{fontSize:10,color:themeIsDark?'rgba(255,255,255,.55)':'rgba(17,17,17,.55)'}}>Card height {cardHeight||'—'} px</div></div>
        <button type="button" onClick={onClose} aria-label="Close share sheet" style={{width:46,height:46,border:'1px solid '+(themeIsDark?'#465047':'#AEB7B0'),borderRadius:23,background:themeIsDark?'#202520':'#111',color:'#fff',fontSize:22,fontWeight:800}}>×</button>
      </div>

      <div style={{flex:'1 1 auto',minHeight:0,display:'flex',alignItems:'center',justifyContent:'center',overflow:'auto',padding:'4px 0 8px',position:'relative',zIndex:1}}>
        <div style={previewStyle}>
          <div ref={cardRef} style={{position:'absolute',left:0,top:0,width:360,transform:`scale(${scale})`,transformOrigin:'top left'}}>
            <PostShareCard post={post} replies={shareReplies} theme={theme} layout={layout} size={size} showAvatar={showAvatar} avatarUrl={post?.profiles?.avatar_url||''} qrDataUrl={assets.qr||''} logoDataUrl={assets[theme]||'/protlys-logo-exact.png'} moreReplies={Math.max(0,(shareReplies?.length||0)-3)}/>
          </div>
        </div>
      </div>

      <div style={{height:48,flex:'0 0 48px',display:'flex',gap:8,alignItems:'center',overflowX:'auto',padding:'4px 0',position:'relative',zIndex:20}}>
        {THEMES.map(item=><button key={item} type="button" aria-pressed={theme===item} onClick={()=>setTheme(item)} style={{height:40,minWidth:82,border:'1px solid #D7DDD8',borderRadius:20,background:theme===item?'#323A33':'#FFFFFF',color:theme===item?'#FFFFFF':'#111111',fontSize:12,fontWeight:900,flex:'0 0 auto'}}>{LABELS[item]}</button>)}
        {['post','thread','clean'].map(item=><button key={item} type="button" aria-pressed={layout===item} onClick={()=>setLayout(item)} style={{height:40,minWidth:82,border:'1px solid #D7DDD8',borderRadius:20,background:layout===item?'#4F9F35':'#FFFFFF',color:layout===item?'#111111':'#111111',fontSize:12,fontWeight:900,flex:'0 0 auto'}}>{item === 'post' ? 'Post' : item === 'thread' ? 'Thread' : 'Clean'}</button>)}
        {isAuthor ? <button type="button" aria-pressed={showAvatar} onClick={()=>setShowAvatar(v=>!v)} style={{height:40,minWidth:112,border:'1px solid #D7DDD8',borderRadius:20,background:showAvatar?'#4F9F35':'#FFFFFF',color:'#111111',fontSize:12,fontWeight:900,flex:'0 0 auto'}}>Avatar {showAvatar?'On':'Off'}</button> : null}
        <button type="button" aria-pressed={size==='story'} onClick={()=>setSize(v=>v==='story'?'standard':'story')} style={{height:40,minWidth:88,border:'1px solid #D7DDD8',borderRadius:20,background:size==='story'?'#4F9F35':'#FFFFFF',color:'#111111',fontSize:12,fontWeight:900,flex:'0 0 auto'}}>Story</button>
      </div>

      <div style={{height:116,flex:'0 0 116px',display:'flex',flexDirection:'column',justifyContent:'flex-end',gap:8,position:'relative',zIndex:20,background:themeIsDark?'#121513':'#F7F8F6'}}>
        <button type="button" onClick={share} disabled={busy||!assets.qr} style={{height:56,border:0,borderRadius:28,background:'#6BCB45',color:'#111',fontSize:14,fontWeight:900,opacity:(busy||!assets.qr)?.6:1}}>{busy?'Preparing…':'Share card'}</button>
        <div style={{height:44,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <button type="button" onClick={save} disabled={busy} style={{height:44,border:'1px solid '+(themeIsDark?'#465047':'#AEB7B0'),borderRadius:22,background:themeIsDark?'#202520':'#fff',color:themeIsDark?'#fff':'#111',fontSize:12,fontWeight:900}}>Save image</button>
          <button type="button" onClick={copyLink} style={{height:44,border:'1px solid '+(themeIsDark?'#465047':'#AEB7B0'),borderRadius:22,background:themeIsDark?'#202520':'#fff',color:themeIsDark?'#fff':'#111',fontSize:12,fontWeight:900}}>Copy link</button>
        </div>
      </div>
      {size==='story'&&cardHeight>640&&<div style={{position:'absolute',right:18,bottom:'calc(122px + env(safe-area-inset-bottom))',fontSize:9,color:themeIsDark?'rgba(255,255,255,.55)':'rgba(17,17,17,.55)',pointerEvents:'none'}}>Story content exceeds 640 px; export uses full content up to 1600 px.</div>}
      {message&&<div role="status" style={{position:'absolute',left:16,right:16,bottom:'calc(124px + env(safe-area-inset-bottom))',textAlign:'center',fontSize:11,fontWeight:800,color:'#4F9F35',pointerEvents:'none'}}>{message}</div>}
    </section>
  </div>,document.body);
}
