'use client';

export default function ProteinTargetCard({ targetG }) {
  const target = Number(targetG);
  if (!Number.isFinite(target) || target <= 0) return null;

  return (
    <div className="screen-pad" style={{paddingTop:0, paddingBottom:0}}>
      <div className="hub-card" style={{padding:16, marginBottom:10}}>
        <div className="t" style={{fontSize:10}}>Your protein target</div>
        <div className="mono" style={{fontSize:28, fontWeight:800, marginTop:5}}>
          {Math.round(target)}g <span style={{fontSize:13, fontWeight:600, color:'var(--ink-45)'}}>/ day</span>
        </div>
        <div style={{fontSize:12, color:'var(--ink-55)', marginTop:5,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
          <span>Your daily protein target from the Protlys calculator.</span>
          <a href="/hub/goal" style={{color:'var(--green-dark)',fontWeight:800,whiteSpace:'nowrap',textDecoration:'none'}}>Edit target →</a>
        </div>
      </div>
    </div>
  );
}
