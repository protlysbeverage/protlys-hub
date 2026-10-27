'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { addFeedCommentAction, getFeedCommentsAction, toggleFeedCommentLikeAction } from './feed-actions';

function Avatar({ name, url, userId }) {
  const content = url ? <img src={url} alt="" style={{ width:30,height:30,minWidth:30,minHeight:30,aspectRatio:'1 / 1',borderRadius:'50%',objectFit:'cover',display:'block' }} /> : <div style={{ width:30,height:30,minWidth:30,minHeight:30,aspectRatio:'1 / 1',borderRadius:'50%',background:'var(--green-soft)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'var(--green-dark)' }}>{(name || '?')[0].toUpperCase()}</div>;
  return userId ? <Link href={`/member/${userId}`} aria-label={`View ${name || 'member'} profile`} style={{ display:'block',width:30,height:30,flexShrink:0,lineHeight:0 }}>{content}</Link> : content;
}

function HeartIcon({ liked }) {
  return <svg viewBox="0 0 24 24" width="15" height="15" fill={liked?'#E1306C':'none'} stroke={liked?'#E1306C':'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8.8 1.4Z" /></svg>;
}

function timeAgo(value) {
  const raw=String(value||''); const normalized=/(?:Z|[+-]\\d{2}:?\\d{2})$/i.test(raw)?raw:`${raw}Z`; const date=new Date(normalized);
  if(Number.isNaN(date.getTime())) return ''; const seconds=Math.max(¶»§q«^