'use client';

import MovementClient from './MovementClient';

export default function MovementPolish(props) {
  return (
    <div className="movement-polish">
      <style>{`
        .movement-polish .hub-card .mono,.movement-polish .metric-number,.movement-polish .stat-number{font-family:'Space Grotesk',sans-serif!important;font-variant-numeric:tabular-nums;letter-spacing:-.025em;}
      `}</style>
      <MovementClient {...props} />
      <div className="screen-pad" style={{paddingTop:0}}>
        <div className="hub-card" style={{marginTop:10,padding:14,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:38,height:38,borderRadius:10,display:'grid',placeItems:'center',flex:'0 0 auto',background:'var(--green-soft)',color:'var(--ink)'}}>
            <span aria-hidden="true" style={{fontSize:20,fontWeight:800,lineHeight:1}}></span>
          </div>
          <div style={{minWidth:0,flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <div className="t">Apple Health</div>
              <span style={{fontSize:10.5,fontWeight:700,color:'var(--ink-70)',border:'1px solid var(--border)',borderRadius:999,padding:'3px 7px',lineHeight:1}}>Coming soon</span>
            </div>
            <div style={{fontSize:11.5,color:'var(--ink-45)',marginTop:3}}>Automatic step syncing on iPhone is coming soon.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
