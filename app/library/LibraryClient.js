'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const BLOG_ENABLED = process.env.NEXT_PUBLIC_BLOG_ENABLED === 'true';
const BLOG_CACHE_KEY = 'protlys-blog-posts-v1';
const BLOG_HOME = 'https://protlys.com/blogs/news';

export default function LibraryClient() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!BLOG_ENABLED) return undefined;

    let cancelled = false;
    async function refresh({ quiet = false } = {}) {
      if (!quiet) setLoading(true);
      try {
        const response = await fetch('/api/blog', { cache: 'no-store', headers: { Accept: 'application/json' } });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.posts)) throw new Error(data.error || 'Could not load articles.');
        if (!cancelled) {
          setPosts(data.posts);
          window.localStorage.setItem(BLOG_CACHE_KEY, JSON.stringify(data.posts));
          setOffline(false);
        }
      } catch {
        if (!cancelled) setOffline(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    try {
      const cached = window.localStorage.getItem(BLOG_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setPosts(parsed);
          setLoading(false);
        }
      }
    } catch {}

    refresh({ quiet: true });
    const onOnline = () => refresh({ quiet: true });
    const onFocus = () => { if (document.visibilityState !== 'hidden') refresh({ quiet: true }); };
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const timer = window.setInterval(() => refresh({ quiet: true }), 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      window.clearInterval(timer);
    };
  }, []);

  if (!BLOG_ENABLED) {
    return (
      <div className="hub-page" style={{maxWidth:760,minHeight:'calc(100dvh - 190px)',margin:'0 auto',padding:'28px 20px 34px',display:'flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box',background:'var(--paper)'}}>
        <div style={{width:'100%',maxWidth:430,display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',gap:0}}>
          <div aria-hidden="true" style={{width:76,height:76,borderRadius:24,display:'grid',placeItems:'center',background:'var(--green-soft)',color:'var(--green-dark)',marginBottom:22}}>
            <svg viewBox="0 0 48 48" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 8.5h19a7 7 0 0 1 7 7v24H17a7 7 0 0 1-7-7z"/>
              <path d="M10 32.5a7 7 0 0 1 7-7h19M18 16h11M18 21h8M29 8.5v7h7"/>
            </svg>
          </div>
          <div className="eyebrow" style={{marginBottom:8}}>Protlys Journal</div>
          <h1 style={{fontSize:28,lineHeight:1.15,letterSpacing:'-.035em',margin:'0 0 12px',color:'var(--ink)'}}>Blog and learn</h1>
          <p style={{fontSize:14,lineHeight:1.7,color:'var(--ink-70)',margin:'0 0 25px',maxWidth:360}}>
            Our journal is coming soon. Practical ideas on protein, movement and everyday wellbeing are on the way.
          </p>
          <Link href="/feed" className="btn-primary" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:48,minWidth:160,padding:'0 24px',borderRadius:999,textDecoration:'none',fontSize:14,fontWeight:800}}>
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="hub-page" style={{maxWidth:980,margin:'0 auto'}}>
      <div style={{marginBottom:16}}>
        <Link href="/feed" aria-label="Back to Hub" style={{display:'inline-flex',alignItems:'center',gap:8,color:'var(--green-dark)',fontSize:13,fontWeight:850,textDecoration:'none',padding:'8px 0'}}>
          <span aria-hidden="true" style={{fontSize:22,lineHeight:1}}>‹</span> Back
        </Link>
      </div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Protlys Journal</div>
          <h1>Blog and learn</h1>
          <p className="page-subtitle">Practical ideas on protein, movement, nutrition, recovery and everyday wellbeing.</p>
        </div>
      </div>

      {offline && posts.length > 0 && <div style={{margin:'12px 0',padding:12,borderRadius:12,background:'var(--green-soft)',color:'var(--green-dark)',fontSize:12,fontWeight:700}}>Showing saved articles. We’ll refresh them when you’re back online.</div>}
      {loading && posts.length === 0 && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>{[0,1,2].map(i=><div key={i} style={{height:250,borderRadius:16,background:'var(--paper)',border:'1px solid var(--line)'}}/>)}</div>}
      {!loading && posts.length === 0 && <div className="library-coming-card"><div><div className="library-kicker">{offline?'Offline':'Protlys Journal'}</div><h3>{offline?'No saved articles yet':'No articles published yet'}</h3><p>{offline?'Connect to the internet to load the latest Protlys articles.':'New articles will appear here automatically when they are published.'}</p></div></div>}

      {posts.length > 0 && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:14,marginTop:12}}>
        {posts.map(post=><a key={post.id} href={post.url} target="_blank" rel="noreferrer" style={{display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden',border:'1px solid var(--line)',borderRadius:17,background:'var(--white)',color:'var(--ink)',textDecoration:'none',boxShadow:'0 2px 10px rgba(15,42,74,.035)'}}>
          {post.coverImage ? <img src={post.coverImage} alt="" loading="lazy" style={{width:'100%',height:166,objectFit:'cover',background:'var(--paper)'}}/> : <div style={{height:166,display:'grid',placeItems:'center',background:'var(--green-soft)',color:'var(--green-dark)',fontSize:34}}>✦</div>}
          <div style={{padding:15,display:'flex',flexDirection:'column',gap:8,flex:1}}>
            <div style={{fontSize:10,fontWeight:850,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--green-dark)'}}>{post.readTime} min read</div>
            <h2 style={{fontSize:17,lineHeight:1.25,margin:0}}>{post.title}</h2>
            <p style={{fontSize:12.5,lineHeight:1.55,color:'var(--ink-70)',margin:0}}>{post.excerpt}</p>
            <span style={{marginTop:'auto',paddingTop:7,fontSize:12,fontWeight:850,color:'var(--green-dark)'}}>Read article →</span>
          </div>
        </a>)}
      </div>}

      <a href={BLOG_HOME} target="_blank" rel="noreferrer" className="btn-primary" style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',minHeight:46,marginTop:22,textDecoration:'none',borderRadius:999}}>Read more on protlys.com</a>
    </div>
  );
}
