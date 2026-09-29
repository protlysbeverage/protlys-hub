'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const SHARE_URL='https://hub.protlys.com/calculator?src=milestone';
const IDENTITY_KEY='protlysShareIdentity';

async function image(src, anonymous=false){
  const img=new Image();
  if(anonymous) img.crossOrigin='anonymous';
  img.src=src;
  await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;});
  if(img.decode) await img.decode().catch(()=>{});
  return img;
}

export default function MilestoneShareCard({milestone,profile}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[showIdentity,setShowIdentity]=useState(true),[open,setOpen]=useState(false);
  useEffect(()=>{try{const v=localStorage.getItem(IDENTITY_KEY);if(v!==null)setShowIdentity(v==='true')}catch{}},[]);
  function identity(v){setShowIdentity(v);try{localStorage.setItem(IDENTITY_KEY,String(v))}catch{}}

  async function draw(){
    if(!milestone?.label||milestone?.value===undefined)throw new Error('missing-milestone');
    if(document.fonts?.ready)await document.fonts.ready;
    const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');if(!x)throw Error('Canvas unavailable');
    const bg=x.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,'#F4FAF5');bg.addColorStop(.5,'#E3F1E6');bg.addColorStop(1,'#CFE7D5');x.fillStyle=bg;x.fillRect(0,0,1080,1350);
    x.fillStyle='rgba(46,158,91,.08)';[[920,150,260],[130,1160,240],[620,650,410]].forEach(([a,b,r])=>{x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.fill()});
    x.beginPath();x.roundRect(54,54,972,1242,48);x.fillStyle='rgba(255,255,255,.95)';x.fill();x.lineWidth=2;x.strokeStyle='rgba(15,42,74,.10)';x.stroke();
    x.beginPath();x.roundRect(74,74,932,1202,38);x.lineWidth=1;x.strokeStyle='rgba(46,158,91,.25)';x.stroke();
    let y=116,logo=null;try{logo=await image('/protlys-logo-exact.png')}catch{}
    if(logo){const s=Math.min(170/logo.width,1);x.drawImage(logo,96,y,logo.width*s,logo.height*s);y+=logo.height*s+34}else y+=60;
    const name=profile?.display_name?.trim(),photo=profile?.avatar_url?.trim();
    if(showIdentity&&name){
      const ax=96,ay=y+2,size=96;x.save();x.beginPath();x.arc(ax+48,ay+48,52,0,Math.PI*2);x.fillStyle='#fff';x.fill();x.beginPath();x.arc(ax+48,ay+48,48,0,Math.PI*2);x.clip();
      let av=null;if(photo){try{av=await image(photo,true)}catch{}}
      if(av)x.drawImage(av,ax,ay,size,size);else{x.fillStyle='#2E9E5B';x.fill();x.fillStyle='#fff';x.font='800 42px "Space Grotesk",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(name[0].toUpperCase(),ax+48,ay+48)}
      x.restore();x.beginPath();x.arc(ax+48,ay+48,50,0,Math.PI*2);x.lineWidth=3;x.strokeStyle='#2E9E5B';x.stroke();x.textAlign='left';x.textBaseline='alphabetic';x.fillStyle='#0F2A4A';x.font='700 25px "IBM Plex Mono",monospace';x.fillText('SHARED BY '+name.toUpperCase(),220,ay+56);y=ay+140;
    }
    x.textAlign='left';x.fillStyle='#1F7A45';x.font='700 27px "IBM Plex Mono",monospace';x.fillText(String(milestone.label).toUpperCase(),96,y+22);y+=108;
    x.fillStyle='#0F2A4A';x.font='400 320px "Fraunces","Playfair Display",Georgia,serif';x.fillText(String(milestone.value),96,y+250);
    x.strokeStyle='rgba(46,158,91,.55)';x.lineWidth=2;x.beginPath();x.moveTo(96,y+300);x.lineTo(984,y+300);x.stroke();x.fillStyle='rgba(15,42,74,.72)';x.font='600 28px Manrope,sans-serif';x.fillText(milestone.subline,96,y+350);
    if(milestone.accent){x.save();x.translate(900,y+180);x.strokeStyle='#2E9E5B';x.fillStyle='rgba(46,158,91,.12)';x.lineWidth=7;x.lineCap='round';x.lineJoin='round';x.beginPath();if(milestone.accent==='flame'){x.moveTo(0,42);x.bezierCurveTo(-35,25,-28,-4,-2,-25);x.bezierCurveTo(-5,-2,13,2,13,-28);x.bezierCurveTo(48,4,39,33,0,42);x.closePath();x.fill();x.stroke()}else if(milestone.accent==='flag'){x.moveTo(-18,45);x.lineTo(-18,-35);x.lineTo(30,-20);x.lineTo(-18,-5);x.moveTo(-25,45);x.lineTo(-8,45);x.stroke()}else{x.moveTo(-28,-18);x.lineTo(0,-38);x.lineTo(28,-18);x.lineTo(22,25);x.lineTo(0,40);x.lineTo(-22,25);x.closePath();x.fill();x.stroke();x.beginPath();x.moveTo(-10,-2);x.lineTo(-2,8);x.lineTo(15,-12);x.stroke()}x.restore()}
    const qx=720,qy=920;x.beginPath();x.roundRect(qx,qy,264,264,28);x.fillStyle='#fff';x.fill();const q=document.createElement('canvas');await QRCode.toCanvas(q,SHARE_URL,{errorCorrectionLevel:'M',margin:1,width:240,color:{dark:'#0F2A4A',light:'#fff'}});x.drawImage(q,qx+12,qy+12,240,240);
    x.fillStyle='#0F2A4A';x.font='700 22px Manrope,sans-serif';x.fillText('Join me at hub.protlys.com',96,1075);x.fillStyle='#1F7A45';x.font='800 30px "IBM Plex Mono",monospace';x.fillText('hub.protlys.com',96,1122);
    return c;
  }
  async function share(){if(busy)return;setBusy(true);setMessage('');try{const c=await draw(),png=await new Promise(r=>c.toBlob(r,'image/png'));if(!png)throw Error('Could not create share image.');const file=new File([png],'protlys-milestone.png',{type:'image/png'});const name=showIdentity&&profile?.display_name?.trim()?profile.display_name.trim():'';if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:milestone.title,text:milestone.shareText(name),url:SHARE_URL});setMessage('Milestone shared.')}else{const u=URL.createObjectURL(png),a=document.createElement('a');a.href=u;a.download='protlys-milestone.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(SHARE_URL);setMessage('Image downloaded. Link copied.')}}catch(e){if(e?.name!=='AbortError'){console.error(e);setMessage('Could not create or share the milestone card. Please try again.')}}finally{setBusy(false)}}
  return <div style={{position:'relative',display:'inline-block'}}><button type="button" className="motion-tap" onClick={()=>setOpen(v=>!v)} disabled={busy} style={{minHeight:40,padding:'7px 10px',border:'1px solid var(--line)',borderRadius:10,background:'var(--white)',color:'var(--green-dark)',fontWeight:800}}>Share</button>{open&&<div style={{position:'absolute',right:0,top:48,width:260,zIndex:50,padding:14,borderRadius:14,border:'1px solid var(--line)',background:'var(--paper)',boxShadow:'0 12px 30px rgba(0,0,0,.15)'}}><div style={{fontSize:11,fontWeight:800,marginBottom:10}}>Share preview</div><label style={{display:'flex',alignItems:'center',gap:9,fontSize:11.5,color:'var(--ink-70)'}}><input type="checkbox" checked={showIdentity} onChange={e=>identity(e.target.checked)} style={{width:18,height:18,accentColor:'var(--green)'}}/>Show my name and photo</label><button type="button" className="btn-primary" onClick={share} disabled={busy} style={{marginTop:12,width:'100%',minHeight:44}}>{busy?'Creating…':'Share card'}</button>{message&&<div role="status" aria-live="polite" style={{fontSize:11,color:'var(--ink-70)',marginTop:8}}>{message}</div>}</div>}</div>;
}
