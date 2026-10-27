'use client';
import {useEffect,useState} from 'react';
export default function BuildStamp(){const [v,setV]=useState(null);useEffect(()=>{fetch('/version.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(setV).catch(()=>{})},[]);return <div style={{fontSize:9.5,color:'var(--ink-45)',marginBottom:10}}>v{v?.shortSha||'local'} · {v?.buildDate||'local'}</div>}
