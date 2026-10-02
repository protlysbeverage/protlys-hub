'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import ShareCard from './ShareCard';

const THEMES = ['dark','light','surface'];
const LOOK_LABELS = { dark:'Dark', light:'Light', surface:'Surface' };
const LOGOS = { dark:'/protlys-logo-dark.png', surface:'/protlys-logo-dark.png', light:'/protlys-logo-exact.png' };
const PUBLIC_SHARE_BASE = 'https://hub.protlys.com/movement';
function publicShareUrl(metric){
  return PUBLIC_SHARE_BASE + '?utm_source=share&utm_medium=card&utm_campaign=' + encodeURIComponent(metric || 'movement');
}

function ShareGlyph(){return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.8-4.6M8 13l7.8 4.6"/></svg>}
function SaveGlyph(){return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 4v5h8V4M8 20v-6h8v6"/></svg>}
function LinkGlyph(){return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15"/></svg>}
function Spinner(){return <span aria-hidden="true" style={{width:16,height:16,border:'2px solid currentColor',borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'protlys-share-spin .7s linear infinite'}}/>}

async function blobToDataUrl(blob){return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onloadend=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}
async function assetDataUrl(path){const response=await fetch(path,{cache:'force-cache'});if(!response.ok)throw new Error('asset');return blobToDataUrl(await response.blob());}
async function waitForImages(node){
  await Promise.all([...node.querySelectorAll('img')].map(async img=>{
    if(img.decode){try{await img.decode();return;}catch{}}
    if(img.complete)return;
    await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});});
  }));
}

export default function ShareCardSheet({open,onClose,data=null,metric,value,unit,label,subtext,progress,username,heatmapDays=[],weeklyDays=[],onAddSteps}){
  const shareData = data || { metric, value:Number(value)||0, unit, label, subtext, progress, heatmapDays, weeklyDays, hasData:true };
  const [selected,setSelected]=useState('dark');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [showUsername,setShowUsername]=useState(true);
  const [assets,setAssets]=useState({});
  const cachedBlobRef=useRef(new Map());
  const renderingRef=useRef(false);
  const [mounted,setMounted]=useState(false);
  const [smallScreen,setSmallScreen]=useState(false);
  const [previewScale,setPreviewScale]=useState(1);
  const [previewMeasured,setPreviewMeasured]=useState(false);
  const previewAreaRef=useRef(null);
  const [hideLooks,setHideLooks]=useState(false);
  const exportRef=useRef(null);
  const historyPushed=useRef(false);
  const touchStart=useRef(null);

  useLayoutEffect(()=>setMounted(true),[]);
  useEffect(()=>{
    if(!open)return;
    let cancelled=false;
    setSelected('dark');setMessage('');setBusy(false);setShowUsername(true);cachedBlobRef.current.clear();
    const updateSize=()=>{const short=window.innerHeight<680;setSmallScreen(short);setHideLooks(window.innerHeight<620);};
    updateSize();window.addEventListener('resize',updateSize);
    setPreviewMeasured(false);
    const measure=()=>{
      const box=previewAreaRef.current;
      if(!box)return;
      const availW=Math.max(0,box.clientWidth);
      const availH=Math.max(0,box.clientHeight);
      if(availW>0 && availH>0){
        setPreviewScale(Math.min(availW/360,availH/640));
        setPreviewMeasured(true);
      }
    };
    measure();
    const observer=new ResizeObserver(measure);
    if(previewAreaRef.current)observer.observe(previewAreaRef.current);
    (async()=>{
      try{
        const [dark,surface,light,qr]=await Promise.all([
          assetDataUrl(LOGOS.dark),assetDataUrl(LOGOS.surface),assetDataUrl(LOGOS.light),
          QRCode.toDataURL(publicShareUrl(shareData.metric),{margin:1,width:220,errorCorrectionLevel:'M',color:{dark:'#111111',light:'#FFFFFF'}})
        ]);
        if(!cancelled)setAssets({dark,surface,light,qr});
      }catch{if(!cancelled)setMessage('Some share assets could not be loaded.');}
    })();
    const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const state=window.history.state;
    if(!state?.protlysShareSheet){window.history.pushState({...state,protlysShareSheet:true},'');historyPushed.current=true;}
    const onPop=()=>{historyPushed.current=false;onClose?.()};
    window.addEventListener('popstate',onPop);
    return()=>{cancelled=true;window.removeEventListener('popstate',onPop);window.removeEventListener('resize',updateSize);observer.disconnect();document.body.style.overflow=oldOverflow;};
  },[open,onClose]);

  function close(){if(!open)return;const shouldBack=historyPushed.current;historyPushed.current=false;onClose?.();if(shouldBack)window.history.back();}
  function selectLook(look){setSelected(look);setHideLooks(false);}
  function cacheKey(){
    return [selected,showUsername,shareData?.metric,shareData?.number,shareData?.unit,shareData?.label,shareData?.subtext,JSON.stringify(shareData?.visual||{}),JSON.stringify(shareData?.highlight||[])].join('|');
  }

  async function renderCard(){
    if(!assets[selected] || !assets.qr)throw new Error('share-assets-not-ready');
    const key=cacheKey();
    const cached=cachedBlobRef.current.get(key);
    if(cached)return cached;
    const node=exportRef.current;if(!node)throw new Error('export-card-not-ready');
    if(document.fonts?.ready)await document.fonts.ready;await waitForImages(node);
    const dataUrl=await toPng(node,{cacheBust:true,pixelRatio:3,width:360,height:640});
    const blob=await (await fetch(dataUrl)).blob();
    cachedBlobRef.current.set(key,blob);
    return blob;
  }

  useEffect(()=>{
    if(!open || !shareData.hasData || !assets[selected] || !assets.qr || renderingRef.current)return;
    const run=()=>{
      if(!open || renderingRef.current)return;
      renderingRef.current=true;
      renderCard().catch(()=>{}).finally(()=>{renderingRef.current=false;});
    };
    const idle=window.requestIdleCallback ? window.requestIdleCallback(run,{timeout:900}) : window.setTimeout(run,180);
    return()=>window.requestIdleCallback ? window.cancelIdleCallback?.(idle) : window.clearTimeout(idle);
  },[open,selected,showUsername,shareData,assets]);

  useEffect(()=>{
    if(!open)return;
    document.body.classList.add('protlys-share-open');
    const appRoot=document.querySelector('.protlys-app');
    if(appRoot){
      appRoot.setAttribute('aria-hidden','true');
      appRoot.setAttribute('inert','');
      appRoot.style.pointerEvents='none';
    }
    return()=>{
      document.body.classList.remove('protlys-share-open');
      if(appRoot){
        appRoot.removeAttribute('aria-hidden');
        appRoot.removeAttribute('inert');
        appRoot.style.pointerEvents='';
      }
    };
  },[open]);
  async function share(){
    if(busy || !shareData.hasData)return;
    const blob=cachedBlobRef.current.get(cacheKey());
    if(!blob){setMessage('Preparing image…');return;}
    const file=new File([blob],'protlys-share-card.png',{type:'image/png'});
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
      navigator.share({files:[file],title:'My Protlys progress'}).catch(error=>{
        if(error?.name!=='AbortError')setMessage('Could not share the card.');
      });
      return;
    }
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='protlys-share-card.png';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function save(){
    if(busy || !shareData.hasData)return;
    setBusy(true);setMessage('');
    try{const blob=cachedBlobRef.current.get(cacheKey()) || await renderCard(),dataUrl=URL.createObjectURL(blob),a=document.createElement('a');a.href=dataUrl;a.download='protlys-share-card.png';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(dataUrl);setMessage('Image saved.');}
    catch(error){console.error(error);setMessage('Could not save the share card.');}
    finally{setBusy(false);}
  }
  async function copyLink(){try{await navigator.clipboard?.writeText(publicShareUrl(shareData.metric));setMessage('Link copied.');}catch{setMessage('Could not copy the link.');}}
  function onTouchStart(e){touchStart.current=e.touches?.[0]?.clientY??null;}
  function onTouchEnd(e){if(touchStart.current==null)return;const dy=(e.changedTouches?.[0]?.clientY??touchStart.current)-touchStart.current;touchStart.current=null;if(dy>90)close();}

  if(!open||!mounted)return null;

  const actionHeight = shareData.hasData ? 100 : 56;

  return createPortal(
    <div style={{position:'fixed',inset:0,zIndex:2147483000,fontFamily:'Manrope,sans-serif'}}>
      <style>{'@keyframes protlys-share-spin{to{transform:rotate(360deg)}}'}</style>
      <div onPointerUp={close} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.60)',touchAction:'none'}}/>
      <section role="dialog" aria-modal="true" aria-label="Share your progress" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{
        position:'absolute',inset:0,width:'100%',height:'100dvh',boxSizing:'border-box',
        padding:'max(env(safe-area-inset-top), 12px) 16px calc(14px + env(safe-area-inset-bottom))',
        background:'var(--paper)',color:'var(--ink)',display:'flex',flexDirection:'column',
        overflow:'hidden',boxShadow:'0 -16px 45px rgba(0,0,0,.22)'
      }}>
        <div style={{width:42,height:5,borderRadius:99,background:'var(--line)',margin:'0 auto 10px',flex:'0 0 auto'}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flex:'0 0 auto'}}>
          <div style={{fontSize:18,fontWeight:800}}>Share your progress</div>
          <button type="button" onPointerUp={(event)=>{event.preventDefault();event.stopPropagation();close();}} aria-label="Close share sheet" style={{width:48,height:48,minWidth:48,border:'1px solid #D7DDD8',borderRadius:'50%',background:'#FFFFFF',color:'#111111',fontSize:20,cursor:'pointer',display:'grid',placeItems:'center'}}>×</button>
        </div>

        <div ref={previewAreaRef} style={{flex:'1 1 auto',minHeight:0,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
          {shareData.hasData ? (
            <div style={{width:360*previewScale,height:640*previewScale,flex:'0 0 auto',position:'relative',visibility:previewMeasured?'visible':'hidden'}}>
              <div style={{width:360,height:640,transform:'scale('+previewScale+')',transformOrigin:'top left'}}>
                <ShareCard metric={shareData.metric} data={shareData} username={username} look={selected} qrDataUrl={assets.qr} logoDataUrl={assets[selected]} showUsername={showUsername} cardWidth={360}/>
              </div>
            </div>
          ) : (
            <div style={{textAlign:'center',maxWidth:290}}>
              <div style={{fontSize:18,fontWeight:800}}>No movement to share yet</div>
              <div style={{fontSize:12,color:'var(--ink-45)',lineHeight:1.45,marginTop:6}}>Add some steps first, then you can create a share card.</div>
              <button type="button" onClick={()=>{close();window.setTimeout(()=>onAddSteps?.(),220);}} style={{marginTop:14,minHeight:44,padding:'0 18px',border:0,borderRadius:12,background:'var(--green)',color:'#fff',fontWeight:800}}>Add steps</button>
            </div>
          )}
        </div>

        {shareData.hasData && (
          <>
            {!hideLooks ? (
              <div style={{display:'flex',justifyContent:'center',gap:8,padding:'4px 0 8px',height:smallScreen?44:62,flex:'0 0 auto',boxSizing:'border-box'}}>
                {THEMES.map(look=><button key={look} type="button" onClick={()=>selectLook(look)} aria-label={'Select '+LOOK_LABELS[look]+' look'} style={{width:smallScreen?58:64,height:smallScreen?44:58,padding:2,border:selected===look?'2px solid #4F9F35':'1px solid #D7DDD8',borderRadius:10,background:'#FFFFFF',overflow:'hidden',cursor:'pointer'}}>
                  <div style={{width:360,height:640,transform:'scale('+(smallScreen?.12:.155)+')',transformOrigin:'top left',borderRadius:6,overflow:'hidden'}}><ShareCard metric={shareData.metric} data={shareData} username={username} look={look} qrDataUrl={assets.qr} logoDataUrl={assets[look]} showUsername={showUsername} cardWidth={360}/></div>
                </button>)}
              </div>
            ) : (
              <button type="button" onClick={()=>setHideLooks(false)} style={{alignSelf:'center',border:0,background:'transparent',color:'var(--green-dark)',fontSize:12,fontWeight:800,padding:'4px 10px 8px',flex:'0 0 auto'}}>Change look</button>
            )}

            <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,minHeight:44,padding:'10px 16px 8px',margin:'0 -16px',fontSize:13,fontWeight:700,borderTop:'1px solid var(--line)',flex:'0 0 auto'}}>
              <span>Show my username</span>
              <input type="checkbox" checked={showUsername} onChange={e=>setShowUsername(e.target.checked)} style={{width:20,height:20,accentColor:'var(--green)'}}/>
            </label>

            {message&&<div role="status" style={{textAlign:'center',fontSize:11.5,fontWeight:700,color:'#4F9F35',margin:'0 0 7px',flex:'0 0 auto'}}>{message}</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,flex:'0 0 auto',minHeight:actionHeight}}>
              <button type="button" onClick={share} disabled={busy || !assets[selected] || !assets.qr} style={{gridColumn:'1 / -1',minHeight:50,border:0,borderRadius:14,background:'#6BCB45',color:'#fff',fontWeight:800,fontSize:14,cursor:busy?'default':'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:9}}>
                {busy?<><Spinner/>Creating…</>:<><ShareGlyph/>Share {LOOK_LABELS[selected]} card</>}
              </button>
              <button type="button" onClick={save} disabled={busy || !assets[selected] || !assets.qr} style={{minHeight:46,border:'1px solid #D7DDD8',borderRadius:14,background:'#FFFFFF',color:'#111111',fontWeight:800,fontSize:13,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7}}><SaveGlyph/>Save image</button>
              <button type="button" onClick={copyLink} disabled={busy} style={{minHeight:46,border:'1px solid var(--line)',borderRadius:14,background:'var(--white)',color:'var(--ink)',fontWeight:800,fontSize:13,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7}}><LinkGlyph/>Copy link</button>
            </div>
          </>
        )}
      </section>

      <div style={{position:'fixed',left:'-10000px',top:0,width:360,height:640,overflow:'hidden',pointerEvents:'none'}} aria-hidden="true">
        <div ref={exportRef}>
          {shareData.hasData && <ShareCard metric={shareData.metric} data={shareData} username={username} look={selected} qrDataUrl={assets.qr} logoDataUrl={assets[selected]} showUsername={showUsername} cardWidth={360}/>}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ShareIconButton({onClick,label='Share'}){
  return <button type="button" aria-label={label} title={label} onClick={e=>{e.stopPropagation();onClick?.()}} style={{width:40,height:40,minWidth:40,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--surface)',color:'var(--ink-45)',display:'grid',placeItems:'center',cursor:'pointer',padding:0}}><ShareGlyph/></button>;
}
