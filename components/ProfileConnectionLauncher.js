'use client';

export default function ProfileConnectionLauncher({ profileId, type = 'followers', count = 0, borderRight = false }) {
  const label = type === 'following' ? 'Following' : 'Followers';

  return (
    <a
      href={`/member/${profileId}/connections?type=${type}`}
      style={{ textAlign:'center', textDecoration:'none', color:'var(--ink)', borderRight:borderRight ? '1px solid var(--line)' : undefined, cursor:'pointer' }}
      aria-label={`View ${count} ${label.toLowerCase()}`}
    >
      <div className="mono" style={{fontSize:16,fontWeight:800}}>{count}</div>
      <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.05em',fontWeight:800,color:'var(--ink-45)',marginTop:2}}>{label}</div>
    </a>
  );
}
