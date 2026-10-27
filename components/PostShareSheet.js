'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import PostShareCard from './PostShareCard';

const THEMES=['dark','light','surface'];
const LABELS={dark:'Dark',light:'Light',surface:'Surface'};

async function assetDataUrl(path){
  const r=await fetch(path,{cache:'force-cache'});
  if(!r.ok) throw new Error('Unable to load '+path);
  const blob=await r.blob();
  return await new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.onerror=reject;f.readAsDataURL(blob)});
}
async function waitImages(node){
  await Promise.all([...node.querySelectorAll('img')].map(async img=>{
    if(img.decode) try{await img.decode();return}catch{}
    if(img.complete)return;
    await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})});
  }));
}
function publicUrl(postId){
  return `https://hub.protlys.com/p/${postId}?utm_source=share&utm_medium=card&utm_campaign=post`;
}

export default function PostShareSheet({open,onClose,post,replies=[],currentUserId=null}){
  const [mounted,setMounted]=useState(false);
  const [theme,setTheme]=useState('dark');
  const [assets,setAssets]=useState({});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [cardHeight,setCardHeight]=useState(0);
  const previewRef=useRef(null);
  const cardR¶»§q«^