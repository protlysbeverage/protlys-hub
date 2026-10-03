'use client';

const THEMES = {
  dark: { panel:'#0D0F0E', surface:'#151815', text:'#F7F8F6', muted:'rgba(247,248,246,.58)', line:'rgba(247,248,246,.14)', accent:'#6BCB45', footer:'#101310' },
  light: { panel:'#F7F8F6', surface:'#FFFFFF', text:'#111311', muted:'rgba(17,19,17,.58)', line:'rgba(17,19,17,.12)', accent:'#4F9F35', footer:'#FFFFFF' },
  surface: { panel:'#151815', surface:'#1D211E', text:'#F7F8F6', muted:'rgba(247,248,246,.58)', line:'rgba(247,248,246,.14)', accent:'#6BCB45', footer:'#151815' },
};

function initials(name='Protlys Member') {
  const clean = String(name).trim();
  return (clean[0] || '?').toUpperCase();
}
function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(String(value).replace(/,/g,''));
  return Number.isFinite(n) ? n.toLocaleString('en-KE') : String(value);
}
function truncateText(value, max=700) {
  const text = String(value || '');
  if (text.length <= max) return { text, truncated:false };
  let cut = text.slice(0,max);
  const boundary = cut.lastIndexOf(' ');
  if (boundary > 0) cut = cut.slice(0,boundary);
  return { text:cut.trimEnd(), truncated:true };
}
function timeLabel(value) {
  if (!value) return '';
  const raw=String(value);
  const normalized=/(?:Z|[+-]\\d{2}:?\\d{2})$/i.test(raw)?raw:raw+'Z';
  const d=new Date(normalized);
  if(Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(d);
}
function textBlock(value) {
  const result=truncateText(value,700);
  return <>
    <div style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',wordBreak:'break-word'}}>{result.text}</div>
    {result.truncated && <div style={{marginTop:8,color:'inherit',fontWeight:800}}>Read the full post on Protlys →</div>}
  </>;
}
function StatBoxes({stats,t}) {
  if(!stats || typeof stats!=='object') return null;
  const items=[['Steps',stats.steps],['Distance',stats.distance],['Duration',stats.duration]]
    .filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!=='');
  if(!items.length) return null;
  return <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(items.length,3)},minmax(0,1fr))`,gap:8,marginTop:14}}>
    {items.map(([label,value])=><div key={label} style={{border:`1px solid ${t.line}`,borderRadius:10,padding:'9px 10px',background:t.surface,minWidth:0}}>
      <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.07em',fontWeight:900,color:t.muted}}>{label}</div>
      <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:12,fontWeight:700,marginTop:3,overflowWrap:'anywhere'}}>{label==='Distance'?String(value):formatNumber(value)}</div>
    </div>)}
  </div>;
}
function Avatar({name,url,showPhoto,size=42,t}) {
  return <div style={{width:size,height:size,borderRadius:size/2,flex:`0 0 ${size}px`,overflow:'hidden',background:t.accent,color:'#111',display:'grid',placeItems:'center',fontWeight:900,fontSize:size*.36}}>
    {showPhoto&&url?<img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:initials(name)}
  </div>;
}
function Author({post,t,showAvatar,avatarUrl}) {
  const name=post?.profiles?.display_name||post?.author_name||'Protlys Member';
  return <div style={{display:'flex',alignItems:'center',gap:10}}>
    <Avatar name={name} url={avatarUrl||post?.profiles?.avatar_url} showPhoto={showAvatar} t={t}/>
    <div style={{minWidth:0}}>
      <div style={{fontSize:14,fontWeight:900,overflowWrap:'anywhere'}}>@{name}</div>
      <div style={{fontSize:10.5,color:t.muted,marginTop:2}}>{timeLabel(post?.created_at)}</div>
    </div>
  </div>;
}

export default function PostShareCard({
  post,
  replies=[],
  theme='dark',
  layout='post',
  size='standard',
  showAvatar=false,
  avatarUrl='',
  qrDataUrl='',
  logoDataUrl='/protlys-logo-exact.png',
  moreReplies=0,
}) {
  const t=THEMES[theme]||THEMES.dark;
  const tag=post?.post_type && post.post_type!=='general' ? String(post.post_type).replace(/_/g,' ') : 'Post';
  const likeCount=Number(post?.like_count||0);
  const cleanReplies=(replies||[]).slice(0,3);
  const story=size==='story';
  const contentStyle=story?{minHeight:640,justifyContent:'center'}:{};
  const footerUrl=`/p/${post?.id}?utm_source=share&utm_medium=card&utm_campaign=post`;
  return <div data-protlys-post-card="true" data-card-layout={layout} style={{width:360,boxSizing:'border-box',padding:20,background:t.panel,color:t.text,fontFamily:'Manrope,system-ui,sans-serif',isolation:'isolate'}}>
    <div style={{borderRadius:20,background:t.surface,border:`1px solid ${t.line}`,overflow:'hidden'}}>
      <div style={{padding:20,...contentStyle}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
          <img src={logoDataUrl} alt="Protlys" style={{width:92,height:24,objectFit:'contain',objectPosition:'left center',display:'block'}}/>
          <div style={{fontSize:9.5,color:t.muted,whiteSpace:'nowrap'}}>{timeLabel(post?.created_at)}</div>
        </div>
        <div style={{marginTop:18}}><Author post={post} t={t} showAvatar={showAvatar} avatarUrl={avatarUrl}/></div>
        <div style={{display:'inline-flex',marginTop:14,padding:'5px 9px',borderRadius:999,background:t.panel,border:`1px solid ${t.line}`,fontSize:9.5,fontWeight:900,textTransform:'capitalize'}}>{tag}</div>
        <div style={{fontSize:15,lineHeight:1.55,fontWeight:600,marginTop:14}}>{textBlock(post?.body||'')}</div>
        {post?.image_url&&<img src={post.image_url} alt="" style={{width:'100%',maxHeight:300,objectFit:'cover',borderRadius:12,display:'block',marginTop:14}}/>}
        <StatBoxes stats={post?.stats} t={t}/>
        {likeCount>0&&<div style={{fontSize:10.5,color:t.muted,fontWeight:800,marginTop:14}}>{likeCount} {likeCount===1?'like':'likes'}</div>}
      </div>
      {layout==='thread'&&<div style={{padding:'0 20px 20px'}}>
        {cleanReplies.length>0&&<div style={{position:'relative',display:'grid',gap:0}}>
          <div style={{position:'absolute',left:20,top:18,bottom:18,width:1,background:t.line}}/>
          {cleanReplies.map((reply,i)=><div key={reply.id||i} style={{display:'flex',gap:10,position:'relative',paddingTop:i?14:4}}>
            <div style={{position:'relative',zIndex:1}}><Avatar name={reply.profiles?.display_name||reply.author_name} t={t}/></div>
            <div style={{minWidth:0,flex:1,paddingTop:1}}>
              <div style={{fontSize:10.5,fontWeight:900}}>@{reply.profiles?.display_name||reply.author_name||'Member'} <span style={{fontWeight:600,color:t.muted,marginLeft:5}}>{timeLabel(reply.created_at)}</span></div>
              <div style={{fontSize:11.5,lineHeight:1.45,marginTop:3,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{truncateText(reply.body||'',700).text}</div>
            </div>
          </div>)}
        </div>}
        {moreReplies>0&&<div style={{fontSize:10.5,fontWeight:900,color:t.accent,marginTop:12}}>+{moreReplies} more replies on Protlys</div>}
      </div>}
    </div>
    {layout==='post'&&<div style={{marginTop:10,padding:'12px 2px 0',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
      <div style={{fontSize:9.5,color:t.muted,lineHeight:1.35}}>View the full post on Protlys</div>
      <div style={{width:58,height:58,padding:4,background:'#fff',borderRadius:7,boxSizing:'border-box',flex:'0 0 58px'}}>{qrDataUrl&&<img src={qrDataUrl} alt="" style={{width:'100%',height:'100%',display:'block'}}/>}</div>
    </div>}
    {layout==='clean'&&<div style={{fontSize:9.5,color:t.muted,marginTop:10,padding:'0 2px'}}>Posted on Protlys · protlys.com</div>}
  </div>;
}

export { THEMES };
