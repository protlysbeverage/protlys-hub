import AppShell from '@/components/AppShell';

export default function FeedLoading() {
  return (
    <AppShell>
      <div className="screen-pad feed-home" aria-busy="true" aria-label="Loading feed">
        <span className="eyebrow">Community</span>
        <h1>Progress feed</h1>
        <p className="subhead">Share movement, milestones and everyday wins with the Hub.</p>
        <style>{`
          .feed-skeleton{height:14px;border-radius:8px;background:var(--line);opacity:.7;animation:feed-pulse 1.3s ease-in-out infinite}
          .feed-skeleton-card{padding:16px;margin:0 0 14px;background:var(--card);border:1px solid var(--line);border-radius:18px}
          @keyframes feed-pulse{50%{opacity:.35}}
          @media(prefers-reduced-motion:reduce){.feed-skeleton{animation:none}}
        `}</style>
        {[0,1,2].map(item => (
          <div className="feed-skeleton-card" key={item}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <div className="feed-skeleton" style={{width:42,height:42,borderRadius:'50%'}} />
              <div style={{flex:1,display:'grid',gap:7}}>
                <div className="feed-skeleton" style={{width:'42%'}} />
                <div className="feed-skeleton" style={{width:'25%',height:10}} />
              </div>
            </div>
            <div className="feed-skeleton" style={{width:'92%',marginBottom:8}} />
            <div className="feed-skeleton" style={{width:'68%',marginBottom:14}} />
            <div className="feed-skeleton" style={{height:150,borderRadius:12}} />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
