'use client';
import {useEffect,useState} from 'react';
export default function BuildStamp(){
  const [web,setWeb]=useState(null);
  const [native,setNative]=useState(null);
  useEffect(()=>{
    fetch('/version.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(setWeb).catch(()=>{});
    const readNative=()=>{
      try {
        const info=window.ProtlysNative?.buildInfo?.();
        if(info)setNative(info);
      } catch {}
    };
    readNative();
    window.addEventListener('protlys:native-ready',readNative);
    return()=>window.removeEventListener('protlys:native-ready',readNative);
  },[]);
  return <div style={{fontSize:9.5,color:'var(--ink-45)',marginBottom:10}}>
    {native ? `Android v${native.versionName} (${native.versionCode}) · ${native.buildDate}` : `v${web?.shortSha||'local'} · ${web?.buildDate||'local'}`}
  </div>;
}
