'use client';

import { Component, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import ShareCard from './ShareCard';

const THEMES=['dark','light','surface'];
const LOOK_LABELS={dark:'Dark',light:'Light',surface:'Surface'};
const LOGOS={dark:'/protlys-logo-dark.png',light:'/protlys-logo-exact.png',surface:'/protlys-logo-dark.png'};
const PUBLIC_SHARE_BASE='https://hub.protlys.com/movement';

function publicShareUrl(metric){return PUBLIC_SHARE_BASE+'?utm_source=share&utm_medium=card&utm_campaign='+encodeURIComponent(metric||'movement');}
function ShareGlyph(){return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.8-4.6M8 13l7.8 4.6"/></svg>}
function SaveGlyph(){return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 4v5h8V4M8 20v-6h8v6"/></svg>}
function LinkGlyph(){return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15"/></svg>}
function Spinner(){return <span aria-hidden="true" style={{width:16,height:16,border:'2px solid currentColor',borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'protlys-share-spin .7s linear infinite'}}/>}

export class ShareSheetErrorBoundary extends Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error('[Protlys ShareSheet] render error',error,info);}
  render(){
    if(this.state.error)return <div role="alert" style={{padding:24,fontFamily:'Manrope,sans-serif',color:'#111',background:'#fff',minHeight:180,borderRadius:20,textAlign:'center'}}><strong>Share card unavailable</strong><div style={{marginTop:8,fontSize:12,color:'#555'}}>Close this sheet and try again.</div></div>;
    return this.props.children;
  }
}

async function blobToDataUrl(blob){return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onloadend=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}
async function assetDataUrl(path){const response=await fetch(path,{cache:'force-cache'});if(!response.ok)throw new Error('asset '+path);return blobToDataUrl(await response.blob());}
async function waitForImages(node){
  await Promise.all([...node.querySelectorAll('img')].map(async img=>{
    if(img.decode){try{await img.decode();return;}catch{}}
    if(img.complete)return;
    await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});});
  }));
}

function computeScale(){
  if(typeof window==='undefined')return 1;
  return Math.max(.3,Math.min(1.2,Math.min((window.innerWidth-40)/360,(window.innerHeight*.6)/640)));
}

function ShareCardSheetInner({open,onClose,data=null,metric,value,unit,label,subtext,progress,username,heatmapDays=[],weeklyDays=[],onAddSteps}){
  const shareData={
    ...(data||{metric,value:Number(value)||0,unit,label,subtext,progress,heatmapDays,weeklyDays}),
    metric:data?.metric||metric,
    value:Number(data?.value??data?.number??value)||0,
    number:Number(data?.number??data?.value??value)||0,
    unit:data?.unit||unit,
    label:data?.label||label,
    subtext:data?.subtext||subtext,
    progress:data?.progress??progress,
    heatmapDays:data?.heatmapDays||heatmapDays,
    weeklyDays:data?.weeklyDays||weeklyDays,
    hasData:data?.hasData ?? (Number(data?.number??data?.value??value)>0 || Number(progress)>0 || Boolean(data?.visual?.days?.some?.(d=>d?.logged)))
  };
  const [selected,setSelected]=useState('dark');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [showUsername,setShowUsername]=useState(true);
  const [assets,setAssets]=useState({});
  const [scale,setScale]=useState(1);
  const previewRef=useRef(null);
  const touchStartRef=useRef(null);
  const cachedBlobRef=useRef(new Map());
  const mountedRef=useRef(false);

  useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;}},[]);

  useEffect(()=>{
    if(!open)return;
    setMessage('');setBusy(false);setShowUsername(true);setScale(computeScale());
    const onResize=()=>setScale(computeScale());
    window.addEventListener('resize',onResize);window.addEventListener('orientationchange',onResize);
    let cancelled=false;
    (async()=>{
      try{
        const [dark,light,qr]=await Promise.all([
          assetDataUrl(LOGOS.dark),assetDataUrl(LOGOS.light),
          QRCode.toDataURL(publicShareUrl(shareData.metric),{margin:1,width:220,errorCorrectionLevel:'M',color:{dark:'#111111',light:'#FFFFFF'}})
        ]);
        if(!cancelled)setAssets({dark,light,surface:dark,qr});
      }catch(error){console.error('[Protlys ShareSheet] asset error',error);if(!cancelled)setMessage('Some share assets could not be loaded.');}
    })();

    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{cancelled=true;window.removeEventListener('resize',onResize);window.removeEventListener('orientationchange',onResize);document.body.style.overflow=oldOverflow;};
  },[open]);

  function close(){if(!open)return;onClose?.();}

  function cacheKey(){return [selected,showUsername,shareData.metric,shareData.number,shareData.unit,shareData.label,shareData.subtext,shareData.progress,JSON.stringify(shareData.visual||{}),JSON.stringify(shareData.highlight||[])].join('|');}

  async function renderCard(){
    const source=previewRef.current;
    if(!source||!assets[selected]||!assets.qr)throw new Error('share-card-not-ready');
    const key=cacheKey();
    const cached=cachedBlobRef.current.get(key);
    if(cached)return cached;
    const holder=document.createElement('div');
    holder.style.position='fixed';holder.style.left='-20000px';holder.style.top='0';holder.style.width='360px';holder.style.height='640px';holder.style.overflow='hidden';holder.style.pointerEvents='none';
    const clone=source.cloneNode(true);
    clone.style.transform='none';clone.style.width='360px';clone.style.height='640px';clone.style.transformOrigin='top left';
    holder.appendChild(clone);document.body.appendChild(holder);
    try{
      if(document.fonts?.ready)await document.fonts.ready;
      await waitForImages(clone);
      const dataUrl=await toPng(clone,{cacheBust:true,pixelRatio:3,width:360,height:640});
      const blob=await (await fetch(dataUrl)).blob();
      cachedBlobRef.current.set(key,blob);
      return blob;
    }finally{holder.remove();}
  }

  useEffect(()=>{
    if(!open||!shareData.hasData||!assets[selected]||!assets.qr)return;
    const id=window.setTimeout(()=>{renderCard().catch(error=>console.warn('[Protlys ShareSheet] pre-render failed',error));},80);
    return()=>window.clearTimeout(id);
  },[open,selected,showUsername,shareData.number,shareData.metric,assets.qr,assets[selected]]);

  async function share(){
    if(busy||!shareData.hasData)return;
    try{
      const blob=await renderCard();
      const file=new File([blob],'protlys-share-card.png',{type:'image/png'});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:'My Protlys progress'});return;}
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='protlys-share-card.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){if(error?.name!=='AbortError'){console.error(error);setMessage('Could not share the card.');}}
  }

  async function save(){
    if(busy||!shareData.hasData)return;
    setBusy(true);setMessage('');
    try{const blob=await renderCard();const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='protlys-share-card.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Image saved.');}
    catch(error){console.error(error);setMessage('Could not save the share card.');}
    finally{setBusy(false);}
  }

  async function copyLink(){try{await navigator.clipboard?.writeText(publicShareUrl(shareData.metric));setMessage('Link copied.');}catch(error){console.error(error);setMessage('Could not copy the link.');}}
  function touchStart(e){touchStartRef.current=e.touches?.[0]?.clientY??null;}
  function touchEnd(e){if(touchStartRef.current==null)return;const dy=(e.changedTouches?.[0]?.clientY??touchStartRef.current)-touchStartRef.current;touchStartRef.current=null;if(dy>90)close();}

  if(!open||!mountedRef.current)return null;

  const wrapperW=360*scale,wrapperH=640*scale;
  const buttonDisabled=!shareData.hasData||!assets[selected]||!assets.qr;

  const content=(
    <div style={{position:'fixed',inset:0,zIndex:2147483000,fontFamily:'Manrope,sans-serif'}}>
      <style>{'@keyframes protlys-share-spin{to{transform:rotate(360deg)}}'}</style>
      <div onPointerUp={close} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.68)',touchAction:'none'}}/>
      <section role="dialog" aria-modal="true" aria-label="Share your progress" onTouchStart={touchStart} onTouchEnd={touchEnd} style={{
        position:'absolute',inset:0,boxSizing:'border-box',padding:'max(env(safe-area-inset-top),10px) 16px calc(10px + env(safe-area-inset-bottom))',
        background:selected==='light'?'#F7F8F6':'#151815',color:selected==='light'?'#111111':'#FFFFFF',
        display:'flex',flexDirection:'column',overflow:'hidden'
      }}>
        <div style={{height:5,width:42,borderRadius:99,background:selected==='light'?'rgba(17,17,17,.18)':'rgba(255,255,255,.18)',margin:'0 auto 8px',flex:'0 0 5px'}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:48,flex:'0 0 48px',position:'relative',zIndex:2}}>
          <div style={{fontSize:18,fontWeight:800}}>Share your progress</div>
          <button type="button" onPointerUp={e=>{e.preventDefault();e.stopPropagation();close();}} aria-label="Close share sheet" style={{width:48,height:48,minWidth:48,border:'1px solid '+(selected==='light'?'#D7DDD8':'rgba(255,255,255,.22)'),borderRadius:'50%',background:selected==='light'?'#FFFFFF':'#232924',color:selected==='light'?'#111111':'#FFFFFF',fontSize:22,lineHeight:1,cursor:'pointer',display:'grid',placeItems:'center'}}>×</button>
        </div>

        <div style={{height:wrapperH,flex:'0 0 '+wrapperH+'px',width:wrapperW,margin:'4px auto 8px',position:'relative'}}>
          {shareData.hasData ? (
            <div style={{width:360,height:640,transform:'scale('+scale+')',transformOrigin:'top left'}}>
              <div ref={previewRef}><ShareCard metric={shareData.metric} data={shareData} username={username} look={selected} qrDataUrl={assets.qr} logoDataUrl={assets[selected]} showUsername={showUsername}/></div>
            </div>
          ) : (
            <div style={{width:wrapperW,height:wrapperH,borderRadius:18,background:selected==='light'?'#FFFFFF':'#232924',display:'grid',placeItems:'center',padding:24,boxSizing:'border-box',textAlign:'center'}}>
              <div><div style={{fontSize:18,fontWeight:800}}>No data to share yet</div><div style={{fontSize:12,opacity:.68,lineHeight:1.45,marginTop:6}}>Add some movement or protein data first.</div>{onAddSteps&&<button type="button" onClick={()=>{close();window.setTimeout(()=>onAddSteps?.(),220);}} style={{marginTop:14,minHeight:44,padding:'0 18px',border:0,borderRadius:12,background:'#6BCB45',color:'#111',fontWeight:800}}>Add steps</button>}</div>
            </div>
          )}
        </div>

        {shareData.hasData&&<div style={{flex:'1 1 auto',minHeight:0,overflowY:'auto',overflowX:'hidden',WebkitOverflowScrolling:'touch',paddingBottom:4}}>
          <div style={{display:'flex',justifyContent:'center',gap:10,padding:'4px 0 10px'}}>
            {THEMES.map(look=><div key={look} style={{width:92,flex:'0 0 92px',textAlign:'center'}}>
              <button type="button" onClick={()=>setSelected(look)} aria-label={'Select '+LOOK_LABELS[look]+' theme'} style={{width:92,height:132,padding:3,border:selected===look?'2px solid #4F9F35':'1px solid '+(selected==='light'?'#D7DDD8':'rgba(255,255,255,.2)'),borderRadius:12,background:selected==='light'?'#FFFFFF':'#232924',overflow:'hidden',cursor:'pointer'}}>
                <div style={{width:72,height:128,transform:'scale(.2)',transformOrigin:'top left',pointerEvents:'none'}}>
                  <ShareCard metric={shareData.metric} data={shareData} username={username} look={look} qrDataUrl={assets.qr} logoDataUrl={assets[look]} showUsername={showUsername}/>
                </div>
              </button>
              <div style={{fontSize:11,fontWeight:700,marginTop:5,opacity:.75}}>{LOOK_LABELS[look]}</div>
            </div>)}
          </div>

          <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:44,padding:'8px 2px',fontSize:13,fontWeight:700,borderTop:'1px solid '+(selected==='light'?'#D7DDD8':'rgba(255,255,255,.14)')}}>
            <span>Show my username</span><input type="checkbox" checked={showUsername} onChange={e=>setShowUsername(e.target.checked)} style={{width:20,height:20,accentColor:'#4F9F35'}}/>
          </label>

          {message&&<div role="status" style={{textAlign:'center',fontSize:11,fontWeight:700,color:'#4F9F35',padding:'2px 0 8px'}}>{message}</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,paddingBottom:4}}>
            <button type="button" onClick={share} disabled={buttonDisabled||busy} style={{gridColumn:'1 / -1',minHeight:50,border:0,borderRadius:14,background:'#6BCB45',color:'#111111',fontWeight:800,fontSize:14,cursor:buttonDisabled?'not-allowed':'pointer',opacity:buttonDisabled?.55:1,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:9}}>{busy?<><Spinner/>Creating…</>:<><ShareGlyph/>Share {LOOK_LABELS[selected]} card</>}</button>
            <button type="button" onClick={save} disabled={buttonDisabled||busy} style={{minHeight:46,border:'1px solid '+(selected==='light'?'#D7DDD8':'rgba(255,255,255,.18)'),borderRadius:14,background:selected==='light'?'#FFFFFF':'#232924',color:selected==='light'?'#111111':'#FFFFFF',fontWeight:800,fontSize:13,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7}}><SaveGlyph/>Save image</button>
            <button type="button" onClick={copyLink} disabled={busy} style={{minHeight:46,border:'1px solid '+(selected==='light'?'#D7DDD8':'rgba(255,255,255,.18)'),borderRadius:14,background:selected==='light'?'#FFFFFF':'#232924',color:selected==='light'?'#111111':'#FFFFFF',fontWeight:800,fontSize:13,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7}}><LinkGlyph/>Copy link</button>
          </div>
        </div>}
      </section>
    </div>
  );

  return createPortal(<ShareSheetErrorBoundary>{content}</ShareSheetErrorBoundary>,document.body);
}

export default function ShareCardSheet(props){
  return <ShareCardSheetInner {...props}/>;
}

export function ShareIconButton({onClick,label='Share',disabled=false}){
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={e=>{e.stopPropagation();onClick?.()}} style={{width:40,height:40,minWidth:40,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--surface)',color:'var(--ink-45)',display:'grid',placeItems:'center',cursor:disabled?'not-allowed':'pointer',padding:0,opacity:disabled?.45:1}}><ShareGlyph/></button>;
}
