'use client';

import { useState } from 'react';
import ShareCardSheet from '@/components/ShareCardSheet';

export default function TargetShareButton({target,activity,goal,profile}) {
 const [open,setOpen]=useState(false);
 return <>
  <button type="button" onClick={()=>setOpen(true)} aria-label="Share protein target" title="Share protein target" style={{width:40,height:40,borderRadius:'50%',border:'1px solid var(--line)',background:'var(--white)',color:'var(--ink)',display:'grid',placeItems:'center',cursor:'pointer',flexShrink:0}}>
   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>
  </button>
  <ShareCardSheet open={open} onClose={()=>setOpen(false)} metric="protein_target" value={Math.round(Number(target)||0)} unit="g/day" label="Daily protein target" subtext={goal ? `${goal} · ${activity} activity` : 'Your Protlys protein target'} progress={Math.min(1,Math.max(0,(Number(target)||0)/220))} username={profile?.display_name || 'protlys'} />
 </>;
}