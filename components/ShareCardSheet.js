'use client';

import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import ShareCard from './ShareCard';

const LOOKS=['dark','light','surface'];
const LABELS={dark:'Dark',light:'Light',surface:'Surface'};
const LOGOS={dark:'/protlys-logo-dark.png',light:'/protlys-logo-exact.png',surface:'/protlys-logo-dark.png'};
const BASE='https://hub.protlys.com/movement';

function publicShareUrl(metric,data){
  if(data?.publicUrl)return data.publicUrl;
  return BASE+'?utm_source=share&utm_medium=card&utm_campaign='+encodeURIComponent(metric||'movement');
}
function ShareGlyph(){return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.8-4.6M8 13l7.8 4.6"/></svg>}
function SaveGlyph(){return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 4v5h8V4M8 20v-6h8v6"/></svg>}
function LinkGlyph(){return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15"/></svg>}
function assetDataUrl(path){return fetch(path,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('Unable to load '+path);return r.blob()}).then(blob=>new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.onerror=reject;f.readAsDataURL(blob)}))}
async function waitForImages(node){await Promise.all([...node.querySelectorAll('img')].map(async img=>{if(img.decode)try{await img.decode();return}catch{}if(img.complete)return;await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})}))}
function computeScale(){
  if(typeof window==='undefined')return 1;
  const w=(window.innerWidth-32)/360;
  const h=(window.innerHeight-56-42-42-116-16)/640;
  return Math.max(0.35,Math.min(1.2,w,h));
}
function idle(fn){if(typeof window==='undefined')return()=>{};if('requestIdleCallback'in window){const id=window.requestIdleCallback(fn,{timeout:500});return()=>window.cancelIdleCallback?.(id)}const id=window.setTimeout(fn,120);return()=>window.clearTimeout(id)}

export class ShareSheetErrorBoundary extends Component{
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return {error}}
  componentDidCatch(error,info){console.error('[Protlys ShareSheet]',error,info)}
  render(){if(this.state.error)return <div role="alert" style={{position:'fixed',inset:0,zIndex:2147483001,background:'#FFFFFF',color:'#111111',display:'grid',placeItems:'center',padding:24,fontFamily:'Manrope,sans-serif'}}><div style={{textAlign:'center'}}><strong>Share card unavailable</strong><div style={{fontSize:12,marginTop:8,color:'#555'}}>Close this sheet and try again.</div></div></div>;return this.props.children}
}

function CardPreview({data,type,look,assets,username,avatarUrl,scale}){
  return <div style={{width:360*scale,height:640*scale,flex:'0 0 auto',position:'relative'}}>
    <div style={{width:360,height:640,position:'absolute',left:0,top:0,transform:'scale('+scale+')',transformOrigin:'top left'}}>
      <ShareCard type={type} metric={data.metric} data={data} username={username} avatarUrl={avatarUrl} look={look} qrDataUrl={assets.qr||''} logoDataUrl={assets[look]||''}/>
    </div>
  </div>
}

function ShareCardSheetInner({open,onClose,data=null,metric,value,unit,label,subtext,progress,username,avatarUrl='',type}){
  const shareData=useMemo(()=>({...data,metric:data?.metric||metric,type:data?.type||type||metric,value:Number(data?.value??data?.number??value)||0,number:Number(data?.number??data?.value??value)||0,unit:data?.unit||unit,label:data?.label||label,subtext:data?.subtext||subtext,progress:data?.progress??progress,hasData:data?.hasData??(Number(data?.number??data?.value??value)>0||Number(progress)>0||Boolean(data?.visual?.days?.some?.(d=>d?.logged)))}),[data,metric,value,unit,label,subtext,progress,type]);
  const [mounted,setMounted]=useState(false);
  const [selected,setSelected]=useState('dark');
  const [assets,setAssets]=useState({});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [scale,setScale]=useState(1);
  const cardHostRef=useRef(null);
  const historyOpenRef=useRef(false);
  const touchStartRef=useRef(null);
  const cacheRef=useRef(new Map());

  useEffect(()=>setMounted(true),[]);

  useEffect(()=>{
    if(!open)return;
    setSelected('dark');
    setMessage('');
    setBusy(false);
    setScale(computeScale());
    const onResize=()=>setScale(computeScale());
    window.addEventListener('resize',onResize);
    window.addEventListener('orientationchange',onResize);

    const previousOverflow=document.body.style.overflow;
    const previousTouch=document.body.style.touchAction;
    document.body.style.overflow='hidden';
    document.body.style.touchAction='none';

    const priorState=window.history.state||{};
    if(!priorState.sheet){
      window.history.pushState({...priorState,sheet:true},'',window.location.href);
      historyOpenRef.current=true;
    }else historyOpenRef.current=false;

    const onPop=()=>{historyOpenRef.current=false;onClose?.()};
    const onKey=e=>{if(e.key==='Escape'){e.preventDefault();closeSheet()}};
    window.addEventListener('popstate',onPop);
    window.addEventListener('keydown',onKey);

    (async()=>{
      try{
        const [dark,light,qr]=await Promise.all([
          assetDataUrl(LOGOS.dark),assetDataUrl(LOGOS.light),
          QRCode.toDataURL(publicShareUrl(shareData.metric,shareData),{margin:1,width:220,errorCorrectionLevel:'M',color:{dark:'#111111',light:'#FFFFFF'}})
        ]);
        setAssets({dark,light,surface:dark,qr});
      }catch(error){console.error('[Protlys ShareSheet] asset load failed',error);setMessage('Some share assets could not be loaded.')}
    })();

    return()=>{window.removeEventListener('resize',onResize);window.removeEventListener('orientationchange',onResize);window.removeEventListener('popstate',onPop);window.removeEventListener('keydown',onKey);document.body.style.overflow=previousOverflow;document.body.style.touchAction=previousTouch};
  },[open,shareData.metric]);

  function closeSheet(){
    if(!open)return;
    if(window.history.state?.sheet){window.history.back();return}
    onClose?.();
  }

  function cacheKey(look=selected){
    return JSON.stringify({look,type:shareData.type,metric:shareData.metric,number:shareData.number,unit:shareData.unit,label:shareData.label,subtext:shareData.subtext,progress:shareData.progress,visual:shareData.visual,highlight:shareData.highlight,username,avatarUrl,publicUrl:shareData.publicUrl});
  }

  async function createExportBlob(look=selected){
    const key=cacheKey(look);
    const cached=cacheRef.current.get(key);
    if(cached)return cached;
    const source=cardHostRef.current?.querySelector('[data-protlys-share-card="true"]');
    if(!source)throw new Error('Share card is not mounted.');
    const holder=document.createElement('div');
    holder.style.cssText='position:fixed;left:-30000px;top:0;width:360px;height:640px;overflow:hidden;pointer-events:none;opacity:1;';
    const clone=source.cloneNode(true);
    clone.style.width='360px';clone.style.height='640px';clone.style.transform='none';clone.style.transformOrigin='top left';clone.style.overflow='hidden';
    holder.appendChild(clone);document.body.appendChild(holder);
    try{
      if(document.fonts?.ready)await document.fonts.ready;
      await waitForImages(clone);
      const dataUrl=await toPng(clone,{cacheBust:true,pixelRatio:3,width:360,height:640,style:{width:'360px',height:'640px',transform:'none',overflow:'hidden'}});
      const blob=await (await fetch(dataUrl)).blob();
      cacheRef.current.set(key,blob);
      return blob;
    }finally{holder.remove()}
  }

  useEffect(()=>{
    if(!open||!mounted||!assets[selected]||!assets.qr||!shareData.hasData)return;
    let cancelled=false;
    const cancel=idle(()=>{if(!cancelled)createExportBlob(selected).catch(error=>console.error('[Protlys ShareSheet] idle pre-render failed',error))});
    return()=>{cancelled=true;cancel?.()};
  },[open,mounted,selected,assets,shareData,username,avatarUrl]);

  async function share(){
    if(busy||!shareData.hasData)return;
    setBusy(true);setMessage('');
    try{
      const blob=await createExportBlob(selected);
      const file=new File([blob],'protlys-share-card.png',{type:'image/png'});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:'My Protlys progress'})}
      else{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='protlys-share-card.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
    }catch(error){if(error?.name!=='AbortError'){console.error('[Protlys ShareSheet] share failed',error);setMessage('Could not share the card.')}}finally{setBusy(false)}
  }
  async function save(){
    if(busy||!shareData.hasData)return;
    setBusy(true);setMessage('');
    try{const blob=await createExportBlob(selected);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='protlys-share-card.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Image saved.')}catch(error){console.error('[Protlys ShareSheet] save failed',error);setMessage('Could not save the share card.')}finally{setBusy(false)}
  }
  async function copyLink(){try{await navigator.clipboard.writeText(publicShareUrl(shareData.metric,shareData));setMessage('Link copied.')}catch(error){console.error('[Protlys ShareSheet] copy failed',error);setMessage('Could not copy the link.')}}
  function touchStart(e){touchStartRef.current=e.touches?.[0]?.clientY??null}
  function touchEnd(e){if(touchStartRef.current==null)return;const dy=(e.changedTouches?.[0]?.clientY??touchStartRef.current)-touchStartRef.current;touchStartRef.current=null;if(dy>90)closeSheet()}

  if(!open||!mounted)return null;
  const content=<div style={{position:'fixed',inset:0,zIndex:2147483000,fontFamily:'Manrope,sans-serif'}}>
    <div aria-hidden="true" onPointerUp={closeSheet} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.6)'}}/>
    <section ref={node=>{cardHostRef.current=node}} role="dialog" aria-modal="true" aria-label="Share your progress" onTouchStart={touchStart} onTouchEnd={touchEnd} style={{position:'absolute',inset:0,width:'100%',height:'100dvh',boxSizing:'border-box',padding:'max(env(safe-area-inset-top),12px) 16px calc(10px + env(safe-area-inset-bottom))',background:'#F7F8F6',color:'#111111',display:'flex',flexDirection:'column',overflow:'hidden',touchAction:'pan-y'}}>
      <div style={{height:56,flex:'0 0 56px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
        <div style={{fontSize:18,fontWeight:800}}>Share your progress</div>
        <button type="button" aria-label="Close share sheet" onPointerUp={e=>{e.preventDefault();e.stopPropagation();closeSheet()}} style={{width:48,height:48,minWidth:48,border:'1px solid #D7DDD8',borderRadius:24,background:'#FFFFFF',color:'#111111',fontSize:20,display:'grid',placeItems:'center',padding:0}}>×</button>
      </div>
      <div style={{flex:'1 1 auto',minHeight:0,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        {shareData.hasData?<CardPreview shareData={shareData} data={shareData} type={shareData.type} selected={selected} look={selected} assets={assets} username={username} avatarUrl={avatarUrl} scale={scale}/>:<div style={{width:360*scale,height:640*scale,display:'grid',placeItems:'center',background:'#232924',color:'#FFFFFF',borderRadius:16,padding:24,boxSizing:'border-box',textAlign:'center'}}>No data to share yet.</div>}
      </div>
      <div style={{height:42,flex:'0 0 42px',display:'flex',justifyContent:'center',gap:8,alignItems:'center'}}>
        {LOOKS.map(look=><button key={look} type="button" aria-pressed={selected===look} onPointerUp={e=>{e.stopPropagation();setSelected(look)}} style={{height:42,minWidth:82,padding:'0 14px',border:'1px solid '+(selected===look?'#4F9F35':'#D7DDD8'),borderRadius:21,background:selected===look?(look==='light'?'#E9EFE7':'#323A33'):'#FFFFFF',color:selected===look?(look==='light'?'#111111':'#FFFFFF'):'#111111',fontSize:12,fontWeight:800}}>{LABELS[look]}</button>)}
      </div>
      <div style={{height:116,flex:'0 0 116px',display:'flex',flexDirection:'column',justifyContent:'flex-end',gap:8,paddingTop:8}}>
        <button type="button" onClick={share} disabled={busy||!assets[selected]||!assets.qr||!shareData.hasData} style={{height:56,flex:'0 0 56px',border:0,borderRadius:28,background:'#6BCB45',color:'#111111',fontSize:14,fontWeight:900,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:9,opacity:(busy||!assets[selected]||!assets.qr||!shareData.hasData)?.55:1}}>{busy?'Preparing…':<><ShareGlyph/>Share {LABELS[selected]} card</>}</button>
        <div style={{height:44,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <button type="button" onClick={save} disabled={busy||!assets[selected]||!assets.qr||!shareData.hasData} style={{height:44,border:'1px solid #AEB7B0',borderRadius:22,background:'#FFFFFF',color:'#111111',fontSize:12,fontWeight:800,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7}}><SaveGlyph/>Save image</button>
          <button type="button" onClick={copyLink} disabled={busy} style={{height:44,border:'1px solid #AEB7B0',borderRadius:22,background:'#FFFFFF',color:'#111111',fontSize:12,fontWeight:800,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7}}><LinkGlyph/>Copy link</button>
        </div>
      </div>
      {message&&<div role="status" style={{position:'absolute',left:16,right:16,bottom:'calc(124px + env(safe-area-inset-bottom))',textAlign:'center',fontSize:11,fontWeight:700,color:'#4F9F35',pointerEvents:'none'}}>{message}</div>}
    </section>
  </div>;
  return createPortal(<ShareSheetErrorBoundary>{content}</ShareSheetErrorBoundary>,document.body);
}

export default function ShareCardSheet(props){return <ShareCardSheetInner {...props}/>}
export function ShareIconButton({onClick,label='Share',disabled=false}){
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={e=>{e.stopPropagation();onClick?.()}} style={{width:44,height:44,minWidth:44,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--surface)',color:'var(--ink-45)',display:'grid',placeItems:'center',cursor:disabled?'not-allowed':'pointer',padding:0,opacity:disabled?.45:1}}><ShareGlyph/></button>
}
