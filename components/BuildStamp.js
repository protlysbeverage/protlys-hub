'use client';
import {useEffect,useState} from 'react';
export default function BuildStamp(){
  const [v,setV]=useState(null);
  useEffect(()=>{
    let active=true;
    fetch('/version.json',{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(value=>{if(active)setV(value)})
      .catch(()=>{});
    return()=>{active=false};
  },[]);
  return <div aria-label="Application version" style={{fontSize:10,lineHeight:1.4,color:'var(--ink-45)',margin:0,padding:'2px 8px',textAlign:'center',fontVariantNumeric:'tabular-nums',overflowWrap:'anywhere'}}>
    v{v?.shortSha||'local'} · {v?.buildDate||'local'}
  </div>;
}
