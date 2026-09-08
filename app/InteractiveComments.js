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
  if(Number.isNaN(date.getTime())) return ''; const seconds=Math.max(0,Math.round((Date.now()-date.getTime())/1000));
  if(seconds<60)return 'Just now'; if(seconds<3600)return `${Math.floor(seconds/60)}m`; if(seconds<86400)return `${Math.floor(seconds/3600)}h`; if(seconds<604800)return `${Math.floor(seconds/86400)}d`;
  return new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short'}).format(date);
}

function CommentRow({ comment, onLike, onReply }) {
  const [replyOpen,setReplyOpen]=useState(false); const [reply,setReply]=useState(''); const [posting,setPosting]=useState(false);
  async function submitReply(){ const clean=reply.trim(); if(!clean||posting)return; setPosting(true); const ok=await onReply(comment.id,clean); setPosting(false); if(ok){setReply('');setReplyOpen(false);} }
  return <div style={{ display:'flex',gap:8,alignItems:'flex-start' }}>
    <Avatar name={comment.profiles?.display_name} url={comment.profiles?.avatar_url} userId={comment.user_id}/>
    <div style={{ minWidth:0,flex:1 }}>
      <div style={{ fontSize:12,lineHeight:1.35 }}><Link href={`/member/${comment.user_id}`} style={{ fontWeight:800,color:'var(--ink)',textDecoration:'none' }}>{comment.profiles?.display_name||'Member'}</Link><span style={{ color:'var(--ink-45)',marginLeft:6,fontSize:10.5 }}>{timeAgo(comment.created_at)}</span></div>
      <div style={{ fontSize:12.5,lineHeight:1.45,marginTop:2,whiteSpace:'pre-wrap',overflowWrap:'anywhere' }}>{comment.body}</div>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginTop:5 }}><button type="button" onClick={()=>onLike(comment.id)} style={{ border:0,background:'transparent',padding:0,display:'inline-flex',alignItems:'center',gap:4,color:comment.liked?'#E1306C':'var(--ink-45)',fontSize:10.5,fontWeight:700,cursor:'pointer' }}><HeartIcon liked={comment.liked}/>{comment.like_count||0}</button><button type="button" onClick={()=>setReplyOpen(v=>!v)} style={{ border:0,background:'transparent',padding:0,color:'var(--ink-45)',fontSize:10.5,fontWeight:700,cursor:'pointer' }}>{replyOpen?'Cancel':'Reply'}</button></div>
      {replyOpen&&<div style={{ display:'flex',gap:7,marginTop:7 }}><input className="field-input" value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitReply()} placeholder="Reply…" style={{ flex:1,minWidth:0,padding:'7px 10px',fontSize:12 }}/><button type="button" className="btn-secondary" onClick={submitReply} disabled={posting||!reply.trim()} style={{ width:'auto',padding:'7px 10px',marginTop:0,fontSize:11 }}>{posting?'Posting…':'Reply'}</button></div>}
    </div>
  </div>;
}

export default function InteractiveComments({ postId, initialCount=0 }) {
  const inputRef=useRef(null); const [comments,setComments]=useState(null); const [expanded,setExpanded]=useState(false); const [loading,setLoading]=useState(false); const [posting,setPosting]=useState(false); const [error,setError]=useState(''); const [body,setBody]=useState('');
  async function load(){ if(loading)return; setLoading(true);setError('');const result=await getFeedCommentsAction({postId});setLoading(false);if(result?.error){setError(result.error);return;}setComments(result.comments||[]); }
  async function focusComments(){if(comments===null)await load();requestAnimationFrame(()=>inputRef.current?.focus());}
  async function toggleCommentLike(commentId){setComments(current=>(current||[]).map(comment=>comment.id===commentId?{...comment,liked:!comment.liked,like_count:Math.max(0,(comment.like_count||0)+(comment.liked?-1:1))}:comment));const result=await toggleFeedCommentLikeAction({commentId});if(result?.error){setError(result.error);await load();}}
  async function replyTo(commentId,replyBody){const result=await addFeedCommentAction({postId,body:replyBody,parentCommentId:commentId});if(result?.error){setError(result.error);return false;}await load();setExpanded(true);return true;}
  async function submit(){const clean=body.trim();if(!clean||posting)return;setPosting(true);setError('');const result=await addFeedCommentAction({postId,body:clean});if(result?.error){setError(result.error);setPosting(false);return;}setBody('');await load();setPosting(false);setExpanded(true);}
  const list=comments||[];const roots=list.filter(comment=>!comment.parent_comment_id);const replies=list.filter(comment=>comment.parent_comment_id);const visibleRoots=expanded?roots:roots.slice(0,3);const hiddenCount=Math.max(0,roots.length-3);
  return <div className="interactive-comments" style={{ marginTop:10 }}>
    {error&&<div style={{ color:'#B3261E',fontSize:12,marginTop:8 }}>{error}</div>}
    {comments===null&&<button type="button" onClick={focusComments} disabled={loading} style={{ border:0,background:'transparent',padding:'4px 0',color:'var(--ink-45)',fontSize:12,fontWeight:700,cursor:'pointer' }}>{loading?'Loading comments…':`${initialCount||0} ${initialCount===1?'comment':'comments'}`}</button>}
    {comments!==null&&<>
      {!error&&list.length===0&&<div style={{ fontSize:12,color:'var(--ink-45)',padding:'7px 0 1px' }}>No comments yet.</div>}
      {roots.length>0&&<div style={{ display:'grid',gap:11,marginTop:8 }}>{visibleRoots.map(comment=><div key={comment.id}><CommentRow comment={comment} onLike={toggleCommentLike} onReply={replyTo}/>{replies.filter(reply=>String(reply.parent_comment_id)===String(comment.id)).map(reply=><div key={reply.id} style={{ marginLeft:38,marginTop:9,paddingLeft:10,borderLeft:'2px solid var(--line)' }}><CommentRow comment={reply} onLike={toggleCommentLike} onReply={replyTo}/></div>)}</div>)}{hiddenCount>0&&<button type="button" onClick={()=>setExpanded(true)} style={{ border:0,background:'transparent',padding:'2px 0',textAlign:'left',color:'var(--ink-60)',font:'inherit',fontSize:12,fontWeight:700,cursor:'pointer' }}>View {hiddenCount} more {hiddenCount===1?'comment':'comments'}</button>}</div>}
      {expanded&&roots.length>3&&<button type="button" onClick={()=>setExpanded(false)} style={{ border:0,background:'transparent',padding:'6px 0 2px',color:'var(--ink-60)',font:'inherit',fontSize:12,fontWeight:700,cursor:'pointer' }}>Show less</button>}
    </>}
    <div style={{ display:'flex',gap:8,marginTop:9 }}><input ref={inputRef} value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} className="field-input" placeholder="Add a comment…" style={{ flex:1,minWidth:0,padding:'9px 11px',fontSize:12.5 }}/><button type="button" onClick={submit} disabled={posting||!body.trim()} className="btn-secondary" style={{ width:'auto',padding:'8px 12px',marginTop:0,fontSize:12 }}>{posting?'Posting…':'Post'}</button></div>
  </div>;
}
