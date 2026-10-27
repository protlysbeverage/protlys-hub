'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
const cache=new Map();
const localDate=()=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const firstName=name=>String(name||'Member').trim().split(/\s+/)[0]||'Member';
const fmt=n=>Number(n||0).toLocaleString('en-US');
function Face({member,size=46,ring=false}){const name=member?.name||member?.display_name||'Member',src=member?.avatar||member?.avatar_url;return src?<img src={src} alt="" style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',border:ring?'3px solid var(--green)':'2px solid var(--white)',boxSizing:'border-box'}}/>:<span style={{width:size,height:size,borderRadius:'50%',display:'grid',placeItems:'center',background:'var(--green-soft)',color:'var(--green-dark)',fontWeight:850,fontSize:size*.32,border:ring?'3px solid var(--green)':'2px solid var(--white)',boxSizing:'border-box'}}>{name.trim().charAt(0).toUpperCase()}</span>}
const dayFmt=(date,locale)=>new Intl.DateTimeFormat(locale||undefined,{weekday:'short',day:'numeric',month:'short'}).format(new Date(date+'T12:00:00'));
const weekdayFmt=(date,locale)=>new Intl.DateTimeFormat(locale||undefined,{weekday:'short'}).format(new Date(date+'T12:00:00'));
const formatSteps = (value, { compact = true } = {}) => {
  const n = Number(value) || 0;
  if (n === 0) return '0';
  if (!com¶»§q«^