'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { addFeedCommentAction, getFeedCommentsAction, getFeedLikeStateAction, toggleFeedLikeAction, toggleFeedCommentLikeAction } from './feed-actions';

function Avatar({ name, url, userId }) {
  const content = url ? <img src={url} alt="" style={{ width:30,height:30,minWidth:30,minHeight:30,aspectRatio:'1 / 1',borderRadius:'50%',objectFit:'cover',display:'block' }} /> : <div style={{ width:30,height:30,minWidth:30,minHeight:30,aspectRatio:'1 / 1',borderRadius:'50%',background:'var(--green-soft)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'var(--green-dark)' }}>{(name || '?')[0].toUpperCase()}</div>;
  return userId ? <Link href={`/member/${userId}`} aria-label={`View ${name || 'member'} profile`} style={{ display:'block',width:30,height:30,flexShrink:0,lineHeight:0 }}>{content}</Link> : content;
}

function timeAgo(value) {
  const raw=String(value||''); const normalized=/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)?raw:`${raw}Z`; const date=new Date(normalized);
  if(Number.isNaN(date.getTime())) return ''; const seconds=Math.max(0,Math.round((Date.now()-date.getTime())/1000));
  if(seconds<60)return 'Just now'; if(seconds<3600)return `${Math.floor(seconds/60)}m`; if(seconds<86400)return `${Math.floor(seconds/3600)}h`; if(seconds<604800)return `${Math.floor(seconds/86400)}d`;
  return new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nai¶»§q«^