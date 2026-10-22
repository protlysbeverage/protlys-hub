'use client';

import { useState } from 'react';
import ShareCardSheet from '@/components/ShareCardSheet';
import { ShareIconButton } from '@/components/ShareIcon';

export default function TargetShareButton({target,activity,goal,profile}) {
 const [open,setOpen]=useState(false);
 return <>
  <ShareIconButton label="Share protein target" onClick={()=>setOpen(true)} />
  <ShareCardSheet open={open} onClose={()=>setOpen(false)} metric="protein_target" value={Math.round(Number(target)||0)} unit="g/day" label="Daily protein target" subtext={goal ? `${goal} · ${activity} activity` : 'Your Protlys protein target'} progress={Math.min(1,Math.max(0,(Number(target)||0)/220))} username={profile?.display_name || 'protlys'} />
 </>;
}