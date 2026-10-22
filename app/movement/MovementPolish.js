'use client';

import MovementClient from './MovementClient';

export default function MovementPolish(props) {
  return (
    <div className="movement-polish">
      <style>{`
        .movement-polish .hub-card .mono,.movement-polish .metric-number,.movement-polish .stat-number{font-family:'Space Grotesk',sans-serif!important;font-variant-numeric:tabular-nums;letter-spacing:-.025em;}
      `}</style>
      <MovementClient {...props} />
      <div className="screen-pad" style={{paddingTop:0,paddingBottom:72}}>
        <div className="hub-card" style={{marginTop:10,padding:14}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,display:'grid',placeItems:'center',flex:'0 0 44px',background:'var(--green-soft)',color:'var(--green-dark)'}}>
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="currentColor">
                <path d="M15.53 12.53c-.02-2.18 1.78-3.24 1.86-3.29a4.05 4.05 0 0 0-3.2-1.73c-1.35-.14-2.65.8-3.34.8-.7 0-1.78-.78-2.92-.76a4.3 4.3 0 0 0-3.62 2.2c-1.56 2.7-.4 6.67 1.1 8.85.75 1.07 1.62 2.26 2.78 2.22 1.12-.05 1.54-.72 2.89-.72 1.35 0 1.73.72 2.9.69 1.2-.02 1.96-1.09 2.69-2.17a8.9 8.9 0 0 0 1.22-2.5 3.9 3.9 0 0 1-2.36-3.59ZM13.35 6.1c.61-.74 1.02-1.78.91-2.81-.88.04-1.94.59-2.57 1.33-.56.65-1.05 1.7-.92 2.7.98.08 1.97-.5 2.58-1.22Z"/>
              </svg>
            </div>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:15,fontWeight:500,lineHeight:1.2,color:'var(--ink)'}}>Apple Health</div>
              <div style={{fontSize:13,color:'var(--ink-45)',lineHeight:1.3,marginTop:3}}>Automatic step syncing</div>
            </div>
            <span style={{fontSize:12,fontWeight:700,color:'var(--green-dark)',background:'var(--green-soft)',borderRadius:999,padding:'5px 9px',lineHeight:1,flex:'0 0 auto',whiteSpace:'nowrap'}}>Coming soon</span>
          </div>
          <div style={{fontSize:13,color:'var(--ink-45)',lineHeight:1.5,marginTop:12}}>Step syncing on iPhone is on the way. For now, log your steps manually.</div>
        </div>
      </div>
    </div>
  );
}
