'use client';

import { useState } from 'react';
import MemberShareSheet from './MemberShareSheet';
import { ShareIcon } from './ShareIcon';

export default function ShareProfileButton(props) {
  const [open,setOpen]=useState(false);
  return <>
    <button type="button" onClick={()=>setOpen(true)} aria-label={"Share "+props.displayName+"'s profile"} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,minHeight:34,padding:'7px 10px',border:'1.5px solid var(--line)',borderRadius:10,background:'#fff',color:'var(--ink)',fontSize:11,fontWeight:800,cursor:'pointer',whiteSpace:'nowrap'}}>
      <span style={{width:32,height:32,flex:"0 0 32px",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"currentColor"}}><ShareIcon size={18} /></span>
      Share
    </button>
    <MemberShareSheet {...props} open={open} onClose={()=>setOpen(false)}/>
  </>;
}
