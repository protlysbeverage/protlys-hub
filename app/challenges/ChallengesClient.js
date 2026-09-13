'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

function Card({children,featured=false}){return <section style={{background:'#fff',border:`1.5px solid ${featured?'rgba(46,158,91,.32)':'var(--line)'}`,borderRadius:18,padding:18,boxShadow:'0 2px 10px rgba(15,42,74,.035)',marginBottom:12}}>{children}</section>}
function Progress({value,max}){const pct=Math.min(100,Math.round((value/max)*100));return <div style={{marginTop:14}}><div style={{height:8,background:'var(--green-soft)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:'var(--green)',borderRadius:99}}/></div><div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--ink-45)',marginTop:6}}><span>{value} of {max}</span><span>{pct}%</span></div></div>}

export default function ChallengesClient({weekDates=[],loggedDates=[],foundingEligible=false,foundingCount=0}){
 const [joined,setJoined]=useState({founding:false,week:false});
 const weekCount=loggedDates.length;
 const weekLabel=weekCount>=5?'Completed':weekCount===4?'Almost there':weekCount===0?'Start whenever you’re ready':`${weekCount} days logged`;
 const todayKey=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi'}).format(new Date());
 const days=useMemo(()=>weekDates.map(date=>({date,logged:loggedDates.includes(date)})),[weekDates,loggedDates]);
 return <div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:20,paddingBottom:24}}>
   <Link href="/hub" style={{display:'inline-flex',alignItems:'center',gap:6,color:'var(--ink-70)',fontSize:13,fontWeight:800,textDecoration:'none',marginBottom:18}}>← Back to Hub</Link>
   <div><span className="eyebrow">Challenges</span><h1 style={{fontSize:26,lineHeight:1.05,margin:'5px 0 0'}}>Build the habit together.</h1><p className="subhead" style={{marginTop:7}}>Short challenges. No leaderboards. Just a reason to keep showing up.</p></div>
   <Card featured>
     <div style={{display:'flex',justifyContent:'space-between',gap:14,alignItems:'flex-start'}}><div style={{flex:1}}><div style={{fontSize:10,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--green-dark)'}}>Founding challenge</div><h2 style={{fontSize:20,margin:'5px 0 0'}}>Founding 250</h2><p style={{fontSize:13,lineHeight:1.5,color:'var(--ink-70)',margin:'7px 0 0'}}>Help build the first 250 people using Protlys to make protein a daily habit.</p></div><div style={{width:46,height:46,borderRadius:14,background:'var(--green-soft)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--green-dark)',fontWeight:900,fontSize:15,flexShrink:0}}>250</div></div>
     <div style={{marginTop:16,padding:'12px 13px',background:'var(--paper)',borderRadius:13}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:800}}><span>{Math.min(250,foundingCount)} of 250 founding members</span><span>{Math.round((Math.min(250,foundingCount)/250)*100)}%</span></div><Progress value={Math.min(250,foundingCount)} max={250}/></div>
     <div style={{marginTop:14,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div style={{fontSize:12,color:'var(--ink-70)'}}>{foundingEligible?'You’ve logged on 5 different days. Founding badge unlocked.':'Log protein on 5 different days to earn your Founding badge.'}</div>{foundingEligible?<span style={{fontSize:11,fontWeight:800,color:'var(--green-dark)',whiteSpace:'nowrap'}}>Unlocked</span>:<button className={joined.founding?'btn-secondary':'btn-primary'} onClick={()=>setJoined(x=>({...x,founding:true}))} style={{width:'auto',padding:'9px 13px',margin:0,whiteSpace:'nowrap'}}>{joined.founding?'Joined':'Join'}</button>}</div>
   </Card>
   <Card>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}><div><div style={{fontSize:10,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--ink-45)'}}>This week</div><h2 style={{fontSize:19,margin:'5px 0 0'}}>5-Day Protein Week</h2></div><span style={{fontSize:11,fontWeight:800,color:weekCount>=5?'var(--green-dark)':'var(--ink-45)'}}>{weekLabel}</span></div>
     <p style={{fontSize:13,lineHeight:1.5,color:'var(--ink-70)',margin:'8px 0 0'}}>Log protein on any 5 days this week. You don’t need to hit your target every day.</p>
     <div style={{display:'flex',gap:6,marginTop:15}}>{days.map((d,i)=><div key={d.date||i} style={{flex:1,textAlign:'center'}}><div style={{height:34,borderRadius:9,background:d.logged?'var(--green)':'var(--paper)',border:`1px solid ${d.logged?'var(--green)':'var(--line)'}`,display:'flex',alignItems:'center',justifyContent:'center',color:d.logged?'#fff':'var(--ink-45)',fontSize:11,fontWeight:800}}>{d.logged?'✓':'·'}</div><div style={{fontSize:9,color:d.date===todayKey?'var(--green-dark)':'var(--ink-45)',fontWeight:d.date===todayKey?800:600,marginTop:5}}>{d.date?new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined,{weekday:'short'}).slice(0,1):''}</div></div>)}</div>
     <Progress value={Math.min(5,weekCount)} max={5}/>
     <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:14}}><span style={{fontSize:12,color:'var(--ink-70)'}}>{weekCount>=5?'You logged on 5 days this week. Solid.':weekCount===4?'4 days logged. You’re close.':weekCount>0?`You logged on ${weekCount} ${weekCount===1?'day':'days'} this week.`:'Nothing logged yet this week. Start whenever you’re ready.'}</span><button className={joined.week?'btn-secondary':'btn-primary'} onClick={()=>setJoined(x=>({...x,week:true}))} style={{width:'auto',padding:'9px 13px',margin:0,whiteSpace:'nowrap'}}>{joined.week?'Joined':'Join'}</button></div>
   </Card>
   <div style={{marginTop:22,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><div><span className="eyebrow">How it works</span><h2 style={{fontSize:17,margin:'4px 0 0'}}>Simple participation</h2></div><span style={{fontSize:11,color:'var(--ink-45)'}}>One at a time</span></div>
   <Card><div style={{display:'grid',gap:12}}><div style={{fontSize:13,lineHeight:1.5,color:'var(--ink-70)'}}>Log protein on the days you choose. For the 5-Day Protein Week, any logged day counts — you do not have to hit your daily target.</div><div style={{fontSize:13,lineHeight:1.5,color:'var(--ink-70)'}}>Founding 250 is based on logging on 5 different days. Once you qualify, your Founding badge is unlocked.</div><div style={{fontSize:12,color:'var(--ink-45)',paddingTop:2}}>Challenges are about participation, not perfection. There are no public rankings.</div></div></Card>
   <Link href="/hub/week" className="btn-secondary" style={{display:'block',textDecoration:'none',textAlign:'center',margin:'14px 0 0'}}>See your week</Link>
 </div>;
}
