'use client';

import { useState } from 'react';
import MemberShareSheet from './MemberShareSheet';

export default function ShareProfileButton(props) {
  const [open,setOpen]=useState(false);
  return <>
    <button type="button" onClick={()=>setOpen(true)} aria-label={"Share "+props.displayName+"'s profile"} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,minHeight:34,padding:'7px 10px',border:'1.5px solid var(--line)',borderRadius:10,background:'#fff',color:'var(--ink)',fontSize:11,fontWeight:800,cursor:'pointer',whiteSpace:'nowrap'}}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.7 6.8-3.4M8.6 13.3l6.8 3.4"/></svg>
      Share
    </button>
    <MemberShareSheet {...props} open={open} onClose={()=>setOpen(false)}/>
  </>;
}
