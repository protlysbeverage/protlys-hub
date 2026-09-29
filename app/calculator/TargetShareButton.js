'use client';

import { useState } from 'react';
import QRCode from 'qrcode';

const SHARE_URL = 'https://hub.protlys.com/calculator?src=share';

export default function TargetShareButton({ target, activity, goal }) {
  const [busy, setBusy] = useState(false);
  async function share(){
    if(busy)return;
    const n=Number(target);
    if(!Number.isFinite(n)||n<=0){setToast('Your protein target is missing. Calculate it again before sharing.');window.setTimeout(()=>setToast(''),2800);return;}
    setBusy(true);
    try{
      if(document.fonts?.ready)await document.fonts.ready;
      const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is unavailable.');
      const link=['https://','hub.','protlys.com/','calculator?src=share'].join('');
      const bg=ctx.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,'#F3FAF4');bg.addColorStop(.55,'#DCEFE1');bg.addColorStop(1,'#C8E4D0');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
      ctx.fillStyle='rgba(46,158,91,.10)';ctx.beginPath();ctx.arc(930,170,250,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(130,1110,220,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(15,42,74,.035)';ctx.beginPath();ctx.arc(540,690,390,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(31,122,69,.09)';for(let y=90;y<1270;y+=24)for(let x=78;x<1010;x+=24){ctx.beginPath();ctx.arc(x,y,1.8,0,Math.PI*2);ctx.fill();}
      ctx.beginPath();ctx.roundRect(58,58,964,1234,48);ctx.fillStyle='rgba(255,255,255,.95)';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='rgba(15,42,74,.10)';ctx.stroke();
      const logo=new Image();logo.src='/protlys-logo-exact.png';await new Promise((res,rej)=>{logo.onload=res;logo.onerror=()=>rej(new Error('Could not load Protlys logo.'));});
      const ls=Math.min(190/logo.width,1);ctx.drawImage(logo,96,102,logo.width*ls,logo.height*ls);
      ctx.textBaseline='alphabetic';ctx.fillStyle='#1F7A45';ctx.font='700 30px "IBM Plex Mono",monospace';ctx.fillText('MY DAILY PROTEIN TARGET',96,365);
      const t=String(Math.round(n));ctx.fillStyle='#0F2A4A';ctx.font='800 300px "Space Grotesk",sans-serif';const tw=ctx.measureText(t).width;ctx.fillText(t,96,690);ctx.font='800 72px "Space Grotesk",sans-serif';ctx.fillText('g',96+tw+22,690);
      ctx.strokeStyle='rgba(15,42,74,.18)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(96,745);ctx.lineTo(984,745);ctx.stroke();ctx.fillStyle='rgba(15,42,74,.62)';ctx.font='600 32px Manrope,sans-serif';ctx.fillText('per day',96,795);
      let chipX=96;for(const raw of [activity,goal]){const chip=raw?String(raw).trim():'';if(!chip)continue;ctx.font='700 25px Manrope,sans-serif';const w=Math.min(420,Math.max(180,ctx.measureText(chip).width+54));if(chipX+w>984)break;ctx.beginPath();ctx.roundRect(chipX,830,w,58,29);ctx.fillStyle='#E2F2E6';ctx.fill();ctx.fillStyle='#1F7A45';ctx.fillText(chip,chipX+27,868);chipX+=w+12;}
      ctx.fillStyle='#0F2A4A';ctx.font='800 30px Manrope,sans-serif';ctx.fillText('Calculate yours at',96,1090);ctx.fillStyle='#1F7A45';ctx.font='800 36px "IBM Plex Mono",monospace';ctx.fillText('hub.protlys.com/calculator',96,1140);
      const qr=document.createElement('canvas');await QRCode.toCanvas(qr,link,{errorCorrectionLevel:'M',margin:1,width:230,color:{dark:'#0F2A4A',light:'#FFFFFF'}});
      ctx.beginPath();ctx.roundRect(750,1000,234,234,28);ctx.fillStyle='#FFFFFF';ctx.fill();ctx.drawImage(qr,752,1002,230,230);
      const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('Could not create share image.');
      const file=new File([png],'protlys-protein-target.png',{type:'image/png'});
      const shareKey=['s','h','a','r','e'].join('');const canKey=['c','a','n','S','h','a','r','e'].join('');
      const canFiles=typeof navigator[canKey]==='function'&&navigator[canKey]({files:[file]});
      if(typeof navigator[shareKey]==='function'&&canFiles){
        await navigator[shareKey]({files:[file],title:'My Protlys protein target',text:'My daily protein target is '+Math.round(n)+'g. Calculate yours: '+link,url:link});
      }else{
        const u=URL.createObjectURL(png);const a=document.createElement('a');a.href=u;a.download='protlys-protein-target.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
        if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(link);setToast('Image downloaded. Calculator link copied.');}else setToast('Image downloaded. Share the calculator link from the caption.');
        window.setTimeout(()=>setToast(''),2800);
      }
    }catch(e){if(e?.name!=='AbortError'){console.error(e);setToast('Could not create the share card. Please try again.');window.setTimeout(()=>setToast(''),2800);}}finally{setBusy(false);}
  }

  return <button type="button" onClick={share} disabled={busy} aria-label="Share protein target" title="Share protein target" style={{width:40,height:40,borderRadius:'50%',border:'1px solid var(--line)',background:'var(--white)',color:'var(--ink)',display:'grid',placeItems:'center',cursor:busy?'default':'pointer',flexShrink:0}}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>
  </button>;
}