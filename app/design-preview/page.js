'use client';

import { useState } from 'react';

const nav = ['Feed','Movement','Challenges','Protein','Dashboard'];
const themes = ['Dark','Light','Surface'];

export default function DesignPreviewPage() {
  const [theme,setTheme]=useState('Dark');
  return (
    <main style={{minHeight:'100dvh',background:theme==='Dark'?'#0D0F0E':'#F7F8F6',color:theme==='Dark'?'#FFF':'#111',fontFamily:'Manrope,sans-serif',padding:'24px 16px 110px'}}>
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,marginBottom:24}}>
          <div>
            <div style={{fontFamily:'Space Grotesk,sans-serif',fontWeight:800,fontSize:26,letterSpacing:'-.04em'}}>Protlys Hub</div>
            <div style={{fontSize:12,opacity:.58,marginTop:4}}>Design inspiration preview — not on main</div>
          </div>
          <div style={{width:42,height:42,borderRadius:21,border:'1px solid '+(theme==='Dark'?'#39413B':'#CDD4CE'),display:'grid',placeItems:'center',fontWeight:800}}>P</div>
        </div>

        <section style={{borderRadius:24,padding:20,background:theme==='Dark'?'#151815':'#FFF',border:'1px solid '+(theme==='Dark'?'#29302B':'#DDE2DE'),boxShadow:'0 14px 40px rgba(0,0,0,.08)',marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.2,textTransform:'uppercase',opacity:.55}}>Share card actions</div>
          <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:42,fontWeight:800,letterSpacing:'-.055em',marginTop:8}}>19,518</div>
          <div style={{fontSize:13,opacity:.58}}>steps this week</div>

          <div style={{display:'flex',gap:8,overflowX:'auto',padding:'18px 0 10px',scrollbarWidth:'none'}}>
            {themes.map(t=>(
              <button key={t} onClick={()=>setTheme(t)} aria-pressed={theme===t} style={{flex:'0 0 auto',height:42,padding:'0 16px',borderRadius:21,border:'1px solid '+(theme===t?'#4F9F35':(theme==='Dark'?'#69736B':'#AEB7B0')),background:theme===t?(t==='Light'?'#E9EFE7':'#323A33'):(theme==='Dark'?'#1B201D':'#FFF'),color:theme===t?(t==='Light'?'#111':'#FFF'):(theme==='Dark'?'#FFF':'#111'),fontWeight:850}}>{t}</button>
            ))}
          </div>

          <button style={{width:'100%',height:56,border:0,borderRadius:28,background:'#6BCB45',color:'#111',fontWeight:900,fontSize:14,boxShadow:'0 8px 22px rgba(107,203,69,.2)'}}>Share Dark card</button>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
            <button style={{height:48,borderRadius:14,border:'1px solid '+(theme==='Dark'?'#69736B':'#8F9A92'),background:theme==='Dark'?'#1B201D':'#FFF',color:theme==='Dark'?'#FFF':'#111',fontWeight:850}}>↓ Save image</button>
            <button style={{height:48,borderRadius:14,border:'1px solid '+(theme==='Dark'?'#69736B':'#8F9A92'),background:theme==='Dark'?'#1B201D':'#FFF',color:theme==='Dark'?'#FFF':'#111',fontWeight:850}}>↗ Copy link</button>
          </div>
        </section>

        <section style={{borderRadius:20,padding:18,background:theme==='Dark'?'#151815':'#FFF',border:'1px solid '+(theme==='Dark'?'#29302B':'#DDE2DE'),marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.2,textTransform:'uppercase',opacity:.55}}>What we are borrowing</div>
          <div style={{display:'grid',gap:10,marginTop:14}}>
            {[
              ['Mobile-first sheets','Actions stay reachable at the bottom; option rows can scroll instead of compressing.'],
              ['Component discipline','One pattern, reused consistently instead of separate one-off versions.'],
              ['Clear hierarchy','One primary CTA, visible secondary actions, and stronger focus states.'],
              ['Protlys identity','The references inform interaction quality, not a copy of another brand.'],
            ].map(([title,body])=>(
              <div key={title} style={{padding:'13px 14px',borderRadius:14,background:theme==='Dark'?'#1B201D':'#F3F5F3'}}>
                <div style={{fontWeight:850,fontSize:13}}>{title}</div>
                <div style={{fontSize:12,lineHeight:1.5,opacity:.62,marginTop:3}}>{body}</div>
              </div>
            ))}
          </div>
        </section>

        <nav aria-label="Preview navigation" style={{position:'fixed',left:'50%',bottom:0,transform:'translateX(-50%)',width:'min(432px,100vw)',padding:'7px 4px calc(12px + env(safe-area-inset-bottom))',display:'flex',background:theme==='Dark'?'#111412':'#FFF',borderTop:'1px solid '+(theme==='Dark'?'#29302B':'#DDE2DE'),boxShadow:'0 -8px 24px rgba(0,0,0,.08)'}}>
          {nav.map((n,i)=><div key={n} style={{flex:1,textAlign:'center',fontSize:11,fontWeight:i===4?800:600,color:i===4?'#4F9F35':(theme==='Dark'?'#8A928C':'#727A74'),padding:'7px 2px'}}><div style={{fontSize:18,lineHeight:1,marginBottom:5}}>{['≡','↯','⚑','◫','▦'][i]}</div>{n}</div>)}
        </nav>
      </div>
    </main>
  );
}
