import AppShell from '@/components/AppShell';

export default function AccountLoading() {
  return (
    <AppShell>
      <div className="screen-pad" aria-busy="true" aria-label="Loading dashboard" style={{display:'grid',gap:14}}>
        <div style={{height:12,width:90,borderRadius:8,background:'var(--line)',opacity:.7}} />
        <div style={{height:28,width:'62%',borderRadius:8,background:'var(--line)',opacity:.7}} />
        <div style={{height:15,width:'78%',borderRadius:8,background:'var(--line)',opacity:.7}} />
        {[0,1,2].map(item=><div key={item} style={{height:118,borderRadius:18,background:'var(--card)',border:'1px solid var(--line)',opacity:.7}} />)}
      </div>
    </AppShell>
  );
}
