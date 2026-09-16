'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const sections = [
  ['posts', 'Posts'],
  ['stats', 'Stats'],
  ['photos', 'Photos'],
];

export default function ProfileSectionNav({ profileId }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSection = searchParams.get('section') || 'posts';
  const onConnectionsPage = pathname?.includes('/connections');

  return (
    <nav aria-label="Profile sections" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:2,margin:'12px 0 5px',padding:3,background:'#fff',border:'1px solid var(--line)',borderRadius:12,position:'sticky',top:76,zIndex:10,boxShadow:'0 2px 7px rgba(0,0,0,.035)'}}>
      {sections.map(([id,label]) => (
        <Link
          key={id}
          href={id === 'posts' ? `/member/${profileId}` : `/member/${profileId}?section=${id}`}
          aria-current={!onConnectionsPage && currentSection === id ? 'page' : undefined}
          style={{minWidth:0,border:0,textAlign:'center',padding:'9px 2px',borderRadius:9,background:!onConnectionsPage&&currentSection===id?'var(--green-soft)':'transparent',color:!onConnectionsPage&&currentSection===id?'var(--green-dark)':'var(--ink-45)',fontSize:10,fontWeight:800,whiteSpace:'nowrap',transition:'background .18s ease,color .18s ease',cursor:'pointer',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center'}}
        >
          {label}
        </Link>
      ))}
      <Link href={`/member/${profileId}/connections?type=followers`} aria-current={onConnectionsPage?'page':undefined} style={{minWidth:0,textAlign:'center',padding:'9px 2px',borderRadius:9,background:onConnectionsPage?'var(--green-soft)':'transparent',color:onConnectionsPage?'var(--green-dark)':'var(--ink-45)',fontSize:10,fontWeight:800,whiteSpace:'nowrap',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>Connections</Link>
    </nav>
  );
}
