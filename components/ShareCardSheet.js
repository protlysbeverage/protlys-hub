'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import ShareCard from './ShareCard';

const THEMES=['dark','light','surface'];
const LOOK_LABELS={dark:'Dark',light:'Light',surface:'Surface'};
const LOGOS={dark:'/protlys-logo-dark.png',surface:'/protlys-logo-dark.png',light:'/protlys-logo-exact.png'};
const QR_TEXT='https://hub.protlys.com/calculator?src=share-card';

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

export default function ShareCardSheet({open,onClose,metric,value,unit,label,subtext,progress,username,heatmapDays=[],highlightBestRun=false,weeklyDays=[]}){
  const [selected,setSelected]=useState('dark'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[showUsername,setShowUsername]=useState(true),[assets,setAssets]=useState({}),[mounted,setMounted]=useState(false);
  const previewRefs=useRef({}),exportRef=useRef(null),scrollRef=useRef(null),historyPushed=useRef(false),touchStart=useRef(null);
  useEffect(()=>setMounted(true),[]);

  useEffect(()=>{
    if(!open)return;
    let cancelled=false;
    setSelected('dark');setMessage('');setBusy(false);setShowUsername(true);
    (async()=>{
      try{
        const [dark,surface,light,qr]=await Promise.all([
          assetDataUrl(LOGOS.dark),assetDataUrl(LOGOS.surface),assetDataUrl(LOGOS.light),
          import('qrcode').then(({default:Q})=>Q.toDataURL(QR_TEXT,{margin:1,width:220,errorCorrectionLevel:'M',color:{dark:'#111111',light:'#FFFFFF'}}))
        ]);
        if(!cancelled)setAssets({dark,surface,light,qr});
      }catch{if(!cancelled)setMessage('Some share assets could not be loaded.');}
    })();
    const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const state=window.history.state;
    if(!state?.protlysShareSheet){window.history.pushState({...state,protlysShareSheet:true},'');historyPushed.current=true;}
    const onPop=()=>{historyPushed.current=false;onClose?.()};
    window.addEventListener('popstate',onPop);
    return()=>{cancelled=true;window.removeEventListener('popstate',onPop);document.body.style.overflow=oldOverflow;};
  },[open,onClose]);

  useEffect(()=>{
    if(!open||!scrollRef.current)return;
    const node=scrollRef.current;
    const onScroll=()=>{
      const center=node.scrollLeft+node.clientWidth/2;let nearest=selected,best=Infinity;
      [...node.querySelectorAll('[data-look-card]')].forEach(card=>{const d=Math.abs(card.offsetLeft+card.offsetWidth/2-center);if(d<best){best=d;nearest=card.dataset.lookCard;}});
      if(nearest!==selected)setSelected(nearest);
    };
    node.addEventListener('scroll',onScroll,{passive:true});return()=>node.removeEventListener('scroll',onScroll);
  },[open,selected]);

  function close(){if(historyPushed.current){historyPushed.current=false;window.history.back();}else onClose?.();}
  function selectLook(look){setSelected(look);const node=scrollRef.current?.querySelector('[data-look-card="'+look+'"]');node?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}
  async function renderCard(){
    if(!assets[selected] || !assets.qr)throw new Error('share-assets-not-ready');
    const preview=previewRefs.current[selected];if(!preview)throw new Error('card-not-ready');
    const node=exportRef.current;if(!node)throw new Error('export-card-not-ready');
    if(document.fonts?.ready)await document.fonts.ready;await waitForImages(node);
    return toPng(node,{cacheBust:true,pixelRatio:3,width:360,height:640});
  }
  async function share(){
    if(busy)return;setBusy(true);setMessage('');
    try{
      const dataUrl=await renderCard(),blob=await(await fetch(dataUrl)).blob(),file=new File([blob],'protlys-share-card.png',{type:'image/png'});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({files:[file],title:'My Protlys progress'});
      else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='protlys-share-card.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
      setMessage('Image ready.');
    }catch(error){if(error?.name!=='AbortError'){console.error(error);setMessage('Could not create the share card.');}}
    finally{setBusy(false);}
  }
  async function save(){
    if(busy)return;setBusy(true);setMessage('');
    try{const dataUrl=await renderCard(),a=document.createElement('a');a.href=dataUrl;a.download='protlys-share-card.png';document.body.appendChild(a);a.click();a.remove();setMessage('Image saved.');}
    catch(error){console.error(error);setMessage('Could not save the share card.');}
    finally{setBusy(false);}
  }
  async function copyLink(){try{await navigator.clipboard?.writeText(QR_TEXT);setMessage('Link copied.');}catch{setMessage('Could not copy the link.');}}
  function onTouchStart(e){touchStart.current=e.touches?.[0]?.clientY??null;}
  function onTouchEnd(e){if(touchStart.current==null)return;const dy=(e.changedTouches?.[0]?.clientY??touchStart.current)-touchStart.current;touchStart.current=null;if(dy>90)close();}

  const weeklyTotal=(weeklyDays||[]).reduce((sum,d)=>sum+Number(metric==='distance'?(d.distance||d.km||0):(d.steps||0)),0);
  const emptyMovement=['steps_today','distance'].includes(metric)&&weeklyTotal<=0;
  if(!open||!mounted)return null;
  return createPortal(<div style={{position:'fixed',inset:0,zIndex:30000,fontFamily:'Manrope,sans-serif'}}>
    <style>{'@keyframes protlys-share-spin{to{transform:rotate(360deg)}}'}</style>
    <div onClick={close} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.60)'}}/>
    <section role="dialog" aria-modal="true" aria-label="Share your progress" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{position:'absolute',left:0,right:0,bottom:0,maxHeight:'90dvh',overflow:'hidden',background:'var(--paper)',color:'var(--ink)',borderRadius:'24px 24px 0 0',padding:'8px 16px calc(14px + env(safe-area-inset-bottom))',boxSizing:'border-box',display:'flex',flexDirection:'column',boxShadow:'0 -16px 45px rgba(0,0,0,.22)'}}>
      <div style={{width:42,height:5,borderRadius:99,background:'var(--line)',margin:'0 auto 12px',flex:'0 0 auto'}}/>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flex:'0 0 auto'}}><div style={{fontSize:18,fontWeight:800}}>Share your progress</div><button type="button" onClick={close} aria-label="Close share sheet" style={{width:44,height:44,minWidth:44,border:'1px solid #D7DDD8',borderRadius:'50%',background:'#FFFFFF',color:'#111111',fontSize:20,cursor:'pointer',pointerEvents:'auto',display:'grid',placeItems:'center'}}>×</button></div>

      <div ref={scrollRef} style={{display:'flex',gap:16,overflow:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none',padding:'12px 8px 8px',margin:'0 -16px',alignItems:'flex-start',flex:'1 1 auto',minHeight:0}}>
        {THEMES.map(look=><div key={look} data-look-card={look} style={{width:'340px',flex:'0 0 auto',scrollSnapAlign:'center',position:'relative'}}><div ref={el=>{previewRefs.current[look]=el}}><ShareCard metric={metric} value={value} unit={unit} label={label} subtext={subtext} progress={progress} username={username} look={look} qrDataUrl={assets.qr} logoDataUrl={assets[look]} showUsername={showUsername} heatmapDays={heatmapDays} highlightBestRun={highlightBestRun} weeklyDays={weeklyDays} cardWidth={340}/></div></div>)}
      </div>

      <div style={{display:'flex',justifyContent:'center',gap:8,padding:'4px 0 8px',flex:'0 0 auto'}}>
        {THEMES.map(look=><button key={look} type="button" onClick={()=>selectLook(look)} aria-label={'Select '+LOOK_LABELS[look]+' look'} style={{width:60,height:96,padding:3,border:selected===look?'2px solid #4F9F35':'1px solid #D7DDD8',borderRadius:10,background:'#FFFFFF',overflow:'hidden',cursor:'pointer'}}><div style={{width:340,height:604,transform:'scale(.16)',transformOrigin:'top left',borderRadius:6,overflow:'hidden'}}><ShareCard metric={metric} value={value} unit={unit} label={label} subtext={subtext} progress={progress} username={username} look={look} qrDataUrl={assets.qr} logoDataUrl={assets[look]} showUsername={showUsername} heatmapDays={heatmapDays} highlightBestRun={highlightBestRun} weeklyDays={weeklyDays} cardWidth={340}/></div></button>)}
      </div>

      <div style={{position:'fixed',left:'-10000px',top:0,width:360,height:640,overflow:'hidden',pointerEvents:'none'}} aria-hidden="true"><div ref={exportRef}><ShareCard metric={metric} value={value} unit={unit} label={label} subtext={subtext} progress={progress} username={username} look={selected} qrDataUrl={assets.qr} logoDataUrl={assets[selected]} showUsername={showUsername} heatmapDays={heatmapDays} highlightBestRun={highlightBestRun} weeklyDays={weeklyDays} cardWidth={360}/></div></div>

      <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,minHeight:44,padding:'2px 2px 8px',fontSize:13,fontWeight:700,flex:'0 0 auto'}}><span>Show my username</span><input type="checkbox" checked={showUsername} onChange={e=>setShowUsername(e.target.checked)} style={{width:20,height:20,accentColor:'var(--green)'}}/></label>
      {message&&<div role="status" style={{textAlign:'center',fontSize:11.5,fontWeight:700,color:'#4F9F35',margin:'0 0 7px',flex:'0 0 auto'}}>{message}</div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,flex:'0 0 auto'}}>
        <button type="button" onClick={share} disabled={busy || emptyMovement || !assets[selected] || !assets.qr} style={{gridColumn:'1 / -1',minHeight:50,border:0,borderRadius:14,background:'#6BCB45',color:'#fff',fontWeight:800,fontSize:14,cursor:busy?'default':'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:9}}>{emptyMovement?'Log some movement to share.':busy?<><span aria-hidden="true" style={{width:16,height:16,border:'2px solid currentColor',borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'protlys-share-spin .7s linear infinite'}}/>Creating…</>:<><ShareGlyph/>Share {LOOK_LABELS[selected]} card</>}</button>
        <button type="button" onClick={save} disabled={busy || emptyMovement || !assets[selected] || !assets.qr} style={{minHeight:46,border:'1px solid #D7DDD8',borderRadius:14,background:'#FFFFFF',color:'#111111',fontWeight:800,fontSize:13,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,cursor:busy?'default':'pointer'}}><SaveGlyph/>Save image</button>
        <button type="button" onClick={copyLink} disabled={busy} style={{minHeight:46,border:'1px solid var(--line)',borderRadius:14,background:'var(--white)',color:'var(--ink)',fontWeight:800,fontSize:13,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,cursor:busy?'default':'pointer'}}><LinkGlyph/>Copy link</button>
      </div>
    </section>
  </div>,document.body);
}

export function ShareIconButton({onClick,label='Share'}){return <button type="button" aria-label={label} title={label} onClick={e=>{e.stopPropagation();onClick?.()}} style={{width:40,height:40,minWidth:40,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--surface)',color:'var(--ink-45)',display:'grid',placeItems:'center',cursor:'pointer',padding:0}}><ShareGlyph/></button>}

