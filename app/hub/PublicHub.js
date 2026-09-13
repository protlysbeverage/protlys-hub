'use client';

import Link from 'next/link';

export default function PublicHub({ foundingCount = 0 }) {
  const count = Math.min(250, Number(foundingCount) || 0);

  return (
    <div className="hub-public" style={{padding:'34px 20px 46px',maxWidth:760,margin:'0 auto'}}>
      <div style={{textAlign:'center',padding:'18px 4px 30px'}}>
        <span className="eyebrow">Protlys Hub</span>
        <h1 style={{fontSize:'clamp(34px,8vw,54px)',lineHeight:1.02,letterSpacing:'-.045em',margin:'10px 0 14px'}}>See your target.<br/>Log in seconds.<br/>Know what to eat next.</h1>
        <p className="subhead" style={{maxWidth:520,margin:'0 auto',fontSize:15}}>Protlys Hub is your daily protein space. No complicated tracking. Just a clear number and a simple next step.</p>
        <div style={{display:'flex',flexDirection:'column',gap:10,maxWidth:360,margin:'24px auto 0'}}>
          <Link href="/signup" className="btn-primary" style={{textDecoration:'none'}}>Start free →</Link>
          <Link href="/login" className="btn-secondary" style={{textDecoration:'none'}}>Already have an account? Log in</Link>
        </div>
        <p style={{fontSize:11.5,color:'var(--ink-45)',marginTop:12}}>Takes 30 seconds. No credit card. Works on your phone.</p>
        <Link href="/hub?guest=1" style={{display:'inline-block',marginTop:9,color:'var(--green-dark)',fontSize:12,fontWeight:800,textDecoration:'none'}}>Try one day without an account →</Link>
      </div>

      <div style={{display:'grid',gap:12,gridTemplateColumns:'repeat(3,minmax(0,1fr))',marginTop:10}}>
        <Frame label="Today" value="95g" caption="remaining" />
        <Frame label="Quick log" value="+25g" caption="in seconds" />
        <Frame label="This week" value="5 days" caption="simple view" />
      </div>

      <section style={{marginTop:30,padding:'20px',background:'#fff',border:'1.5px solid var(--line)',borderRadius:18}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--ink-45)'}}>Founding Members</div>
        <div style={{display:'flex',alignItems:'baseline',gap:7,marginTop:5}}><span className="mono" style={{fontSize:30,fontWeight:800}}>{count}</span><span style={{fontSize:14,color:'var(--ink-45)'}}>of 250</span></div>
        <p style={{fontSize:13,lineHeight:1.5,color:'var(--ink-70)',margin:'8px 0 0'}}>We’re building the first group of people who treat protein as a daily habit, not a gym-only thing.</p>
        <div style={{height:7,background:'var(--green-soft)',borderRadius:999,overflow:'hidden',marginTop:13}}><div style={{height:'100%',width:`${Math.round((count/250)*100)}%`,background:'var(--green)',borderRadius:999}}/></div>
      </section>

      <p style={{textAlign:'center',fontSize:11,color:'var(--ink-45)',marginTop:24}}>Your target → your log → your remaining protein. Everything else can wait.</p>
    </div>
  );
}

function Frame({label,value,caption}) {
  return <div style={{background:'#fff',border:'1.5px solid var(--line)',borderRadius:16,padding:'16px 10px',minHeight:105,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
    <div style={{fontSize:10,fontWeight:800,color:'var(--ink-45)',textTransform:'uppercase',letterSpacing:'.08em'}}>{label}</div>
    <div><div className="mono" style={{fontSize:23,fontWeight:800}}>{value}</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>{caption}</div></div>
  </div>;
}
