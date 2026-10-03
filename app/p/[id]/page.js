import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export const dynamic='force-dynamic';
export const revalidate=0;

function dateLabel(value){
  const raw=String(value||'');const normalized=/(?:Z|[+-]\\d{2}:?\\d{2})$/i.test(raw)?raw:raw+'Z';const d=new Date(normalized);
  if(Number.isNaN(d.getTime()))return '';
  return new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(d);
}
function Avatar({name,url,size=38}){return url?<img src={url} alt="" style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',display:'block',flex:'0 0 auto'}}/>:<div style={{width:size,height:size,borderRadius:'50%',background:'var(--green-soft)',color:'var(--green-dark)',display:'grid',placeItems:'center',fontWeight:900,fontSize:size*.35,flex:'0 0 auto'}}>{(name||'?')[0].toUpperCase()}</div>}
function Stats({stats}){const items=[['Steps',stats?.steps],['Distance',stats?.distance],['Duration',stats?.duration]].filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!=='');if(!items.length)return null;return <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(3,items.length)},minmax(0,1fr))`,gap:8,marginTop:14}}>{items.map(([label,v])=><div key={label} style={{border:'1px solid var(--line)',borderRadius:10,padding:'9px 10px',background:'var(--paper)'}}><div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.07em',fontWeight:900,color:'var(--ink-45)'}}>{label}</div><div className="mono" style={{fontSize:12,fontWeight:800,marginTop:3,overflowWrap:'anywhere'}}>{label==='Distance'?v:Number(String(v).replace(/,/g,''))?.toLocaleString?.('en-KE')||v}</div></div>)}</div>}
export async function generateMetadata({params}){
  const {id}=await params;
  return {
    title:'Protlys post',
    description:'A post shared from Protlys Hub.',
    openGraph:{title:'Protlys post',description:'A post shared from Protlys Hub.',url:`https://hub.protlys.com/p/${id}`,images:[{url:`https://hub.protlys.com/p/${id}/opengraph-image`,width:1200,height:630,alt:'Protlys post'}]},
    twitter:{card:'summary_large_image',title:'Protlys post',images:[`https://hub.protlys.com/p/${id}/opengraph-image`]},
  };
}

export default async function PublicPostPage({params}){
  const {id}=await params;const supabase=await createClient();
  const {data:post}=await supabase.from('feed_posts').select('id,user_id,body,image_url,post_type,stats,created_at,profiles(display_name,avatar_url),feed_likes(count),feed_comments(count)').eq('id',id).maybeSingle();
  if(!post)notFound();
  const {data:comments}=await supabase.from('feed_comments').select('id,user_id,parent_comment_id,body,created_at,profiles(display_name,avatar_url)').eq('post_id',id).order('created_at',{ascending:true});
  const roots=(comments||[]).filter(c=>!c.parent_comment_id);const replies=(comments||[]).filter(c=>c.parent_comment_id);
  const name=post.profiles?.display_name||'Protlys Member';const likes=post.feed_likes?.[0]?.count||0;
  return <AppShell><div className="screen-pad" style={{paddingTop:18,paddingBottom:40,maxWidth:680,margin:'0 auto'}}>
    <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:7,color:'var(--ink-70)',textDecoration:'none',fontSize:12,fontWeight:800,marginBottom:12}}>← Back to Feed</Link>
    <article style={{background:'var(--paper)',border:'1.5px solid var(--line)',borderRadius:20,padding:18}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <Avatar name={name} url={post.profiles?.avatar_url}/><div style={{minWidth:0}}><div style={{fontWeight:900,overflowWrap:'anywhere'}}>@{name}</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>{dateLabel(post.created_at)}</div></div>
        <span style={{marginLeft:'auto',background:'var(--green-soft)',color:'var(--green-dark)',padding:'5px 9px',borderRadius:999,fontSize:9.5,fontWeight:900,textTransform:'capitalize'}}>{String(post.post_type||'post').replace(/_/g,' ')}</span>
      </div>
      {post.body&&<div style={{fontSize:15,lineHeight:1.6,marginTop:16,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{post.body}</div>}
      {post.image_url&&<img src={post.image_url} alt="" style={{width:'100%',maxHeight:520,objectFit:'cover',borderRadius:14,display:'block',marginTop:14}}/>}
      <Stats stats={post.stats}/>
      {likes>0&&<div style={{fontSize:11,color:'var(--ink-45)',fontWeight:800,marginTop:14}}>{likes} {likes===1?'like':'likes'}</div>}
    </article>
    <section style={{marginTop:18}}>
      <div className="eyebrow" style={{marginBottom:8}}>Thread</div>
      {roots.length===0?<div style={{fontSize:13,color:'var(--ink-45)',padding:'12px 0'}}>No replies yet.</div>:roots.map(root=>{
        const rootReplies=replies.filter(r=>String(r.parent_comment_id)===String(root.id));
        return <div key={root.id} style={{display:'flex',gap:9,alignItems:'flex-start',padding:'12px 0',borderBottom:'1px solid var(--line)'}}>
          <Avatar name={root.profiles?.display_name} url={root.profiles?.avatar_url} size={32}/>
          <div style={{minWidth:0,flex:1}}><div style={{fontSize:11,fontWeight:900}}>@{root.profiles?.display_name||'Member'} <span style={{fontWeight:600,color:'var(--ink-45)',marginLeft:5}}>{dateLabel(root.created_at)}</span></div><div style={{fontSize:12.5,lineHeight:1.5,marginTop:3,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{root.body}</div>
          {rootReplies.map(reply=><div key={reply.id} style={{display:'flex',gap:8,marginTop:10,paddingLeft:10,borderLeft:'2px solid var(--line)'}}><Avatar name={reply.profiles?.display_name} url={reply.profiles?.avatar_url} size={28}/><div style={{minWidth:0}}><div style={{fontSize:10.5,fontWeight:900}}>@{reply.profiles?.display_name||'Member'}</div><div style={{fontSize:12,lineHeight:1.45,marginTop:2,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{reply.body}</div></div></div>)}
          </div>
        </div>
      })}
    </section>
    <div style={{marginTop:18,textAlign:'center',fontSize:10.5,color:'var(--ink-45)'}}>Shared from Protlys Hub · protlys.com</div>
  </div></AppShell>;
}
