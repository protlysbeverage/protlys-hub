'use client';

import Link from 'next/link';

export default function ProteinTargetCard({ targetG, todayG = 0 }) {
  const target = Number(targetG);
  if (!Number.isFinite(target) || target <= 0) return null;
  const today = Math.max(0, Number(todayG) || 0);
  const progress = Math.min(100, Math.round(today / target * 100));

  return (
    <div className="screen-pad" style={{paddingTop:0,paddingBottom:0}}>
      <div className="hub-card" style={{padding:16,marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
          <div>
            <div className="t" style={{fontSize:10}}>YOUR PROTEIN TODAY</div>
            <div className="mono" style={{fontSize:28,fontWeight:800,marginTop:5}}>{today}g <span style={{fontSize:13,fontWeight:600,color:'var(--ink-45)'}}>/ {Math.round(target)}g</span></div>
            <div style={{fontSize:12,color:'var(--ink-55)',marginTop:5}}>{progress}% of your daily target recorded.</div>
          </div>
          <Link href="/protein" className="btn-secondary" style={{width:'auto',margin:0,textDecoration:'none',whiteSpace:'nowrap'}}>Log protein</Link>
        </div>
        <div role="progressbar" aria-label="Protein target progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{height:7,background:'var(--green-soft)',borderRadius:999,overflow:'hidden',marginTop:13}}>
          <div style={{height:'100%',width:progress+'%',background:'var(--green)',borderRadius:999}}/>
        </div>
        <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:8}}>Daily target · <Link href="/hub/goal" style={{color:'var(--green-dark)',fontWeight:800}}>Edit target</Link></div>
      </div>
    </div>
  );
}
