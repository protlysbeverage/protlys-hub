'use client';

import { useState } from 'react';
import ModerationSheet from './ModerationSheet';

export default function ProfileModerationButton({ userId, displayName }) {
  const [menu,setMenu]=useState(false),[sheet,setSheet]=useState(null);
  return <div style={{position:'relative'}}>
    <button type="button" aria-label="Profile options" onClick={()=>setMenu(v=>!v)} style={{width:44,height:44,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--white)',color:'var(--ink-70)',fontSize:22,cursor:'pointer'}}>⋮</button>
    {menu&&<div className="post-menu" style={{position:'absolute',right:0,top:48,zIndex:50}}><button type="button" onClick={()=>{setMenu(false);setSheet({mode:'report'})}}>Report</button><button type="button" className="danger" onClick={()=>{setMenu(false);setSheet({mode:'block'})}}>Block</button></div>}
    {sheet&&<ModerationSheet open={true} onClose={()=>setSheet(null)} mode={sheet.mode} reportedUserId={userId} reportedUsername={displayName||'Member'} contentType="profile" contentId={userId} contentSnapshot={{user_id:userId,display_name:displayName||null}} onBlocked={()=>{setSheet(null);window.location.assign('/')}}/>}
  </div>;
}