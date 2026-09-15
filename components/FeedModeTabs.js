'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function FeedModeTabs() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('feed') === 'following' ? 'following' : 'for-you';
  return <div style={{ display:'flex', gap:4, padding:4, background:'var(--paper)', border:'1px solid var(--line)', borderRadius:14, margin:'10px 0 14px' }}>
    <Link href="/?feed=for-you" replace style={{ flex:1, textAlign:'center', textDecoration:'none', padding:'9px 10px', borderRadius:10, fontSize:12, fontWeight:800, color:mode === 'for-you' ? '#fff' : 'var(--ink-45)', background:mode === 'for-you' ? 'var(--green)' : 'transparent' }}>For You</Link>
    <Link href="/?feed=following" replace style={{ flex:1, textAlign:'center', textDecoration:'none', padding:'9px 10px', borderRadius:10, fontSize:12, fontWeight:800, color:mode === 'following' ? '#fff' : 'var(--ink-45)', background:mode === 'following' ? 'var(--green)' : 'transparent' }}>Following</Link>
  </div>;
}
