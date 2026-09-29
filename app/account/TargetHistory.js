'use client';

import { useState } from 'react';

export default function TargetHistory({ rows=[] }) {
  const [open,setOpen]=useState(false);
  const points=rows.map(row=>({value:Number(row.target_g),date:row.effective_from})).filter(p=>Number.isFinite(p.value));
  const width=320,height=120,pad=14,min=points.length?Math.min(...points.map(p=>p.value)):20,max=points.length?Math.max(...points.map(p=>p.value)):20,range=Math.max(1,max-min);
  const coords=points.map((p,i)=>{const x=points.length===1?width/2:pad+i*(width-pad*2)/(points.length-1);const y=height-pad-((p.value-min)/range)*(height-pad*2);return [x,y];});
  const d=coords.map(([x,y],i)=>(i?'L':'M')+' '+x.toFixed(1)+' '+y.toFixed(1)).join(' ');
  return <section style={{marginTop:10,border:'1.5px solid var(--line)',borderRadius:16,background:'var(--white)',overflow:'hidden'}}>
    <button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'15px',border:0,background:'transparent',color:'var(--ink)',fontWeight:800,fontSize:14,cursor:'pointer',textAlign:'left'}}><span>My target history</span><span aria-hidden="true" style={{fontSize:18,color:'var(--ink-45)'}}>{open?'−':'+'}</span></button>
    {open && <div style={{padding:'0 15px 15px'}}>{points.length<2?<div style={{padding:'10px 0 2px',fontSize:12.5,color:'var(--ink-70)'}}>Save another target to see your trend.</div>:<div style={{height:150}}>
      <svg viewBox={'0 0 '+width+' '+height} width="100%" height="120" role="img" aria-label="Protein target history line chart" preserveAspectRatio="none"><line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad} stroke="var(--line)"/><path d={d} fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{coords.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4" fill="var(--green)"/>)}</svg>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--ink-45)'}}><span>{points[0].date}</span><span>{points[points.length-1].date}</span></div>
    </div>}</div>}
  </section>;
}