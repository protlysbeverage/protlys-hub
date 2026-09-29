'use client';

import { useState } from 'react';

export default function TargetShareButton({ target }) {
  const [busy, setBusy] = useState(false);
  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const canvas=document.createElement('canvas'); canvas.width=1080; canvas.height=1350;
      const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvas is unavailable.');
      ctx.fillStyle='#EEF4EF'; ctx.fillRect(0,0,1080,1350);
      ctx.fillStyle='#FFFFFF'; ctx.roundRect(70,70,940,1210,42); ctx.fill();
      const logo=new Image(); logo.src='/protlys-logo-exact.png';
      await new Promise((resolve,reject)=>{logo.onload=resolve;logo.onerror=reject;});
      const scale=Math.min(1,260/logo.width); ctx.drawImage(logo,70,120,logo.width*scale,logo.height*scale);
      ctx.fillStyle='#1F7A45'; ctx.font='600 30px "IBM Plex Mono", monospace'; ctx.fillText('MY DAILY PROTEIN TARGET',100,430);
      ctx.fillStyle='#0F2A4A'; ctx.font='800 150px "Space Grotesk", sans-serif'; ctx.fillText(String(Math.round(target)),100,600);
      ctx.font='700 48px Manrope, sans-serif'; ctx.fillText('g / day',430,600);
      ctx.font='600 32px Manrope, sans-serif'; ctx.fillText('A clear number I can actually use.',100,700);
      ctx.fillStyle='#2E9E5B'; ctx.roundRect(100,770,880,12,6); ctx.fill();
      ctx.fillStyle='#0F2A4A'; ctx.font='700 34px Manrope, sans-serif'; ctx.fillText('Calculate yours at',100,1120);
      ctx.fillStyle='#1F7A45'; ctx.font='800 38px "IBM Plex Mono", monospace'; ctx.fillText('hub.protlys.com',100,1180);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png')); if(!blob) throw new Error('Could not create share image.');
      const file=new File([blob],'protlys-protein-target.png',{type:'image/png'});
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))) await navigator.share({files:[file],title:'My Protlys protein target',text:'My daily protein target is '+Math.round(target)+'g.'});
      else { const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='protlys-protein-target.png'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
    } catch(error) { if(error?.name!=='AbortError') console.error(error); } finally { setBusy(false); }
  }
  return <button type="button" onClick={share} disabled={busy} aria-label="Share protein target" title="Share protein target" style={{width:40,height:40,borderRadius:'50%',border:'1px solid var(--line)',background:'var(--white)',color:'var(--ink)',display:'grid',placeItems:'center',cursor:busy?'default':'pointer',flexShrink:0}}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>
  </button>;
}