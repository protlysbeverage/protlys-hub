'use client';

import { useState } from 'react';
import ModerationSheet from './ModerationSheet';

export default function ProfileModerationButton({ userId, displayName }) {
  const [sheet,setSheet]=useState(null);
  return <>
    <button type="button" aria-label="Profile options" onClick={()=>setSheet({mode:'report'})} style={{width:44,height:44,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--white)',color:'var(--ink-70)',fontSize:22,cursor:'pointer'}}>⋮</button>
    {sheet&&<ModerationSheet open={true} onClose={()=>setSheet(null)} mode={sheet.mode} reportedUserId={userId} reportedUsername={displayName||'Member'} contentType="profile" contentId={userId} contentSnapshot={{user_id:userId,display_name:displayName||null}} onBlocked={()=>{setSheet(null);window.location.assign('/')}}/>}
  </>;
}