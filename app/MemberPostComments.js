'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { addFeedCommentAction, getFeedCommentsAction, getFeedLikeStateAction, toggleFeedLikeAction } from './feed-actions';

function Avatar({ name, url, userId }) {
  const content = url ? <img src={url} alt="" style={{ width:30,height:30,minWidth:30,minHeight:30,aspectRatio:'1 / 1',borderRadius:'50%',objectFit:'cover',display:'block' }} /> : <div style={{ width:30,height:30,minWidth:30,minHeight:30,aspectRatio:'1 / 1',borderRadius:'50%',background:'var(--green-soft)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'var(--green-dark)' }}>{(name || '?')[0].toUpperCase()}</div>;
  return userId ? <Link href={`/member/${userId}`} aria-label={`View ${name || 'member'} profile`} style={{ display:'block',width:30,height:30,flexShrink:0,lineHeight:0 }}>{content}</Link> : content;
}

function timeAgo(value) {
  const raw=String(value||''); const normalized=/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)?raw:`${raw}Z`; const date=new Date(normalized);
  if(Number.isNaN(date.getTime())) return ''; const seconds=Math.max(0,Math.round((Date.now()-date.getTime())/1000));
  if(seconds<60) return 'Just now'; if(seconds<3600) return `${Math.floor(seconds/60)}m`; if(seconds<86400) return `${Math.floor(seconds/3600)}h`; if(seconds<604800) return `${Math.floor(seconds/86400)}d`;
  return new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short'}).format(date);
}

function HeartIcon({ liked }) { return <svg viewBox="0 0 24 24" width="18" height="18" fill={liked?'#E1306C':'none'} stroke={liked?'#E1306C':'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8.8 1.4Z" /></svg>; }
function CommentIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.7 7.5 8.5 8.5 0 0 1-3.4-.7L4 20l1.3-3.7A7.2 7.2 0 0 1 4.5 12 7.5 7.5 0 0 1 12 4.5h.5A7.5 7.5 0 0 1 20 11.5Z" /></svg>; }

export default function MemberPostComments({ postId, initialCount=0, initialLikeCount=0 }) {
  const inputRef=useRef(null); const [comments,setComments]=useState(null); const [expanded,setExpanded]=useState(false); const [loading,setLoading]=useState(false); const [posting,setPosting]=useState(false); const [error,setError]=useState(''); const [body,setBody]=useState(''); const [likeCount,setLikeCount]=useState(Number(initialLikeCount||0)); const [liked,setLiked]=useState(false); const [likeLoading,setLikeLoading]=useState(false);

  async function load(){ if(loading) return; setLoading(true); setError(''); const result=await getFeedCommentsAction({postId}); setLoading(false); if(result?.error){setError(result.error);return;} setComments(result.comments||[]); }
  useEffect(()=>{ if(initialCount>0) load(); getFeedLikeStateAction({postId}).then(result=>{if(!result?.error)setLiked(Boolean(result.liked));}); },[postId,initialCount]);

  async function focusComments(){ if(comments===null) await load(); requestAnimationFrame(()=>inputRef.current?.focus()); }
  async function toggleLike(){ if(likeLoading)return; const next=!liked; setLiked(next); setLikeCount(c=>Math.max(0,c+(next?1:-1))); setLikeLoading(true); const result=await toggleFeedLikeAction({postId}); setLikeLoading(false); if(result?.error){setLiked(!next);setLikeCount(c=>Math.max(0,c+(next?-1:1)));setError(result.error);} }
  async function submit(){ const clean=body.trim(); if(!clean||posting)return; setPosting(true);setError(''); const result=await addFeedCommentAction({postId,body:clean}); if(result?.error){setError(result.error);setPosting(false);return;} setBody(''); const refreshed=await getFeedCommentsAction({postId}); setPosting(false); if(refreshed?.error){setError(refreshed.error);return;} setComments(refreshed.comments||[]); setExpanded(true); }

  const list=comments||[]; const visible=expanded?list:list.slice(0,3); const hiddenCount=Math.max(0,list.length-3); const commentCount=comments===null?Number(initialCount||0):list.length;

  return <div className="profile-post-engagement" style={{ marginTop:10,paddingTop:10,borderTop:'1px solid var(--line)' }}>
    <div className="profile-post-actions" style={{ display:'flex',alignItems:'center',gap:14,minHeight:28 }}>
      <button type="button" onClick={toggleLike} disabled={likeLoading} aria-label={liked?'Unlike post':'Like post'} style={{ border:0,background:'transparent',padding:2,display:'inline-flex',alignItems:'center',gap:6,color:liked?'#E1306C':'var(--ink-60)',fontSize:12,fontWeight:700,cursor:likeLoading?'default':'pointer' }}><HeartIcon liked={liked}/><span>{likeCount}</span></button>
      <button type="button" onClick={focusComments} aria-label="Comment on post" style={{ border:0,background:'transparent',padding:2,display:'inline-flex',alignItems:'center',gap:6,color:'var(--ink-60)',fontSize:12,fontWeight:700,cursor:'pointer' }}><CommentIcon/><span>{commentCount}</span></button>
    </div>
    {likeCount>0 && <div style={{ marginTop:7,fontSize:11.5,fontWeight:800,color:'var(--ink)' }}>{likeCount} {likeCount===1?'like':'likes'}</div>}
    {comments===null && initialCount>0 && <div style={{ marginTop:8,fontSize:12,color:'var(--ink-45)' }}>{loading?'Loading comments…':'Comments'}</div>}
    {comments!==null && <>
      {error && <div style={{ color:'#B3261E',fontSize:12,marginTop:8 }}>{error}</div>}
      {!error && list.length===0 && <div style={{ fontSize:12,color:'var(--ink-45)',padding:'7px 0 1px' }}>No comments yet.</div>}
      {visible.map(comment=><div key={comment.id} style={{ display:'flex',gap:8,marginTop:9,alignItems:'flex-start' }}><Avatar name={comment.profiles?.display_name} url={comment.profiles?.avatar_url} userId={comment.user_id}/><div style={{ minWidth:0,flex:1 }}><div style={{ fontSize:12,lineHeight:1.35 }}><Link href={`/member/${comment.user_id}`} style={{ fontWeight:800,color:'var(--ink)',textDecoration:'none' }}>{comment.profiles?.display_name||'Member'}</Link><span style={{ color:'var(--ink-45)',marginLeft:6,fontSize:10.5 }}>{timeAgo(comment.created_at)}</span></div><div style={{ fontSize:12.5,lineHeight:1.45,marginTop:2,whiteSpace:'pre-wrap',overflowWrap:'anywhere' }}>{comment.body}</div></div></div>)}
      {!expanded&&hiddenCount>0&&<button onClick={()=>setExpanded(true)} style={{ border:0,background:'transparent',padding:'7px 0 2px',color:'var(--ink-60)',font:'inherit',fontSize:12,fontWeight:700,cursor:'pointer' }}>View {hiddenCount} more {hiddenCount===1?'comment':'comments'}</button>}
      {expanded&&list.length>3&&<button onClick={()=>setExpanded(false)} style={{ border:0,background:'transparent',padding:'7px 0 2px',color:'var(--ink-60)',font:'inherit',fontSize:12,fontWeight:700,cursor:'pointer' }}>Show less</button>}
    </>}
    <div style={{ display:'flex',gap:8,marginTop:8 }}><input ref={inputRef} value={body} onChange={e=>setBody(e.target.value)} onFocus={()=>comments===null&&load()} onKeyDown={e=>e.key==='Enter'&&submit()} className="field-input" placeholder="Add a comment…" style={{ flex:1,minWidth:0,padding:'8px 11px',fontSize:12.5 }}/><button onClick={submit} disabled={posting||!body.trim()} className="btn-secondary" style={{ width:'auto',padding:'8px 12px',marginTop:0,fontSize:12 }}>{posting?'Posting…':'Post'}</button></div>
  </div>;
}
