'use client';

const THEMES = {
  dark: { panel:'#0D0F0E', surface:'#151815', text:'#F7F8F6', muted:'rgba(247,248,246,.58)', line:'rgba(247,248,246,.14)', accent:'#6BCB45' },
  light: { panel:'#F7F8F6', surface:'#FFFFFF', text:'#111311', muted:'rgba(17,19,17,.58)', line:'rgba(17,19,17,.12)', accent:'#4F9F35' },
  surface: { panel:'#151815', surface:'#1D211E', text:'#F7F8F6', muted:'rgba(247,248,246,.58)', line:'rgba(247,248,246,.14)', accent:'#6BCB45' },
};

function initials(name='Protlys Member') {
  return (String(name).trim()[0] || '?').toUpperCase();
}
function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(String(value).replace(/,/g,''));
  return Number.isFinite(n) ? n.toLocaleString('en-KE') : String(value);
}
function truncateText(value, max=700) {
  const text=String(value||'');
  if(text.length<=max) return {text,truncated:false};
  let cut=text.slice(0,max), boundary=cut.lastIndexOf(' ');
  if(boundary>0) cut=cut.slice(0,boundary);
  return {text:cut.trimEnd(),truncated:true};
}
function timeLabel(value) {
  if (!value) return '';
  const d = new Date(String(value).trim());
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    day:'numeric', month:'short', hour:'numeric', minute:'2-digit', hour12:true
  }).format(d).replace(/, /,' · ');
}
function Avatar({name,url,t,size=42}) {
  return <div style={{width:size,height:size,borderRadius:'50%',flex:'0 0 auto',overflow:'hidden',background:t.accent,color:'#111',display:'grid',placeItems:'center',fontWeight:900,fontSize:size*.36}}>
    {url ? <img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/> : initials(name)}
  </div>;
}
function StatBoxes({stats,t}) {
  if(!stats || typeof stats!=='object') return null;
  const items=[['Steps',stats.steps],['Distance',stats.distance],['Duration',stats.duration]].filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!=='');
  if(!items.length) return null;
  return <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(items.length,3)},minmax(0,1fr))`,gap:8,marginTop:14}}>
    {items.map(([label,value])=><div key={label} style={{border:`1px solid ${t.line}`,borderRadius:10,padding:'9px 10px',background:t.surface,minWidth:0}}>
      <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'.07em',fontWeight:900,color:t.muted}}>{label}</div>
      <div style={{fontSize:12,fontWeight:800,marginTop:3,overflowWrap:'anywhere'}}>{label==='Distance'?String(value):formatNumber(value)}</div>
    </div>)}
  </div>;
}

export default function PostShareCard({
  post,
  theme='dark',
  showAvatar=false,
  avatarUrl='',
  qrDataUrl='',
  logoDataUrl='/protlys-logo-exact.png',
}) {
  const t=THEMES[theme]||THEMES.dark;
  const name=post?.profiles?.display_name||post?.author_name||'Protlys Member';
  const timestamp=timeLabel(post?.created_at);
  const tag=post?.post_type&&post.post_type!=='general'?String(post.post_type).replace(/_/g,' '):'Post';
  const likes=Number(post?.like_count||0);
  const body=truncateText(post?.body||'',700);

  return <div data-protlys-post-card="true" style={{width:360,boxSizing:'border-box',padding:20,background:t.panel,color:t.text,fontFamily:'Plus Jakarta Sans,system-ui,sans-serif',isolation:'isolate'}}>
    <div style={{borderRadius:20,background:t.surface,border:`1px solid ${t.line}`,overflow:'hidden'}}>
      <div style={{padding:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
          <img src={logoDataUrl} alt="Protlys" style={{width:92,height:24,objectFit:'contain',objectPosition:'left center',display:'block',flex:'0 0 auto'}}/>
          {timestamp ? <span style={{fontSize:10.5,fontWeight:800,color:t.muted,whiteSpace:'nowrap',textAlign:'right'}}>{timestamp}</span> : <span aria-hidden="true" />}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginTop:18}}>
          <Avatar name={name} url={showAvatar?(avatarUrl||post?.profiles?.avatar_url||''):''} t={t}/>
          <div style={{minWidth:0}}>
            <div style={{fontSize:14,fontWeight:900,overflowWrap:'anywhere'}}>@{name}</div>
          </div>
        </div>
        <div style={{display:'inline-flex',marginTop:14,padding:'5px 9px',borderRadius:999,background:t.panel,border:`1px solid ${t.line}`,fontSize:9.5,fontWeight:900,textTransform:'capitalize'}}>{tag}</div>
        <div style={{fontSize:15,lineHeight:1.55,fontWeight:600,marginTop:14,whiteSpace:'pre-wrap',overflowWrap:'anywhere',wordBreak:'break-word'}}>
          {body.text}
          {body.truncated&&<div style={{marginTop:8,fontWeight:800}}>Read the full post on Protlys →</div>}
        </div>
        {post?.image_url&&<img src={post.image_url} alt="" style={{width:'100%',maxHeight:300,objectFit:'cover',borderRadius:12,display:'block',marginTop:14}}/>}
        <StatBoxes stats={post?.stats} t={t}/>
        {likes>0&&<div style={{fontSize:10.5,color:t.muted,fontWeight:800,marginTop:14}}>{likes} {likes===1?'like':'likes'}</div>}
      </div>
    </div>
    <div style={{marginTop:10,padding:'12px 2px 0',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
      <div style={{fontSize:9.5,color:t.muted,lineHeight:1.35}}>View the full post on Protlys</div>
      <div style={{width:58,height:58,padding:4,background:'#fff',borderRadius:7,boxSizing:'border-box',flex:'0 0 58px'}}>{qrDataUrl&&<img src={qrDataUrl} alt="" style={{width:'100%',height:'100%',display:'block'}}/>}</div>
    </div>
  </div>;
}

export { THEMES };