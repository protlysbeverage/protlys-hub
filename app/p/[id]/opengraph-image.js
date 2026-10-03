import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime='edge';
export const alt='Protlys post';
export const size={width:1200,height:630};
export const contentType='image/png';

function cut(text,max=700){const s=String(text||'');if(s.length<=max)return s;let x=s.slice(0,max);const i=x.lastIndexOf(' ');return (i>0?x.slice(0,i):x).trimEnd()+'…';}
export default async function Image({params}){
  const {id}=await params;const supabase=await createClient();
  const {data:post}=await supabase.from('feed_posts').select('id,body,post_type,created_at,profiles(display_name),feed_likes(count)').eq('id',id).maybeSingle();
  if(!post)return new ImageResponse(<div style={{fontSize:48,padding:60}}>Protlys post</div>,size);
  const name=post.profiles?.display_name||'Protlys Member';const likes=post.feed_likes?.[0]?.count||0;
  return new ImageResponse(<div style={{width:'100%',height:'100%',background:'#0D0F0E',color:'#F7F8F6',display:'flex',flexDirection:'column',padding:52,fontFamily:'sans-serif'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:42,fontWeight:900,letterSpacing:-2}}>Protlys</div><div style={{fontSize:24,opacity:.6}}>protlys.com</div></div>
    <div style={{marginTop:36,fontSize:25,opacity:.65,fontWeight:800}}> @{name} · {String(post.post_type||'post').replace(/_/g,' ')}</div>
    <div style={{marginTop:20,fontSize:42,lineHeight:1.25,fontWeight:650,whiteSpace:'pre-wrap',overflow:'hidden'}}>{cut(post.body||'Shared a post on Protlys.')}</div>
    <div style={{marginTop:'auto',fontSize:22,opacity:.58}}>{likes>0?likes+' '+(likes===1?'like':'likes'):'Protlys Hub'}</div>
  </div>,size);
}
