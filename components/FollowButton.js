'use client';

import { useState } from 'react';
import { toggleFollowAction } from '@/app/follow-actions';

export default function FollowButton({ profileId, initialFollowing = false, initialFollowers = 0, compact = false }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(Number(initialFollowers || 0));
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const result = await toggleFollowAction({ profileId });
    setLoading(false);
    if (result?.error) return;
    setFollowing(Boolean(result.following));
    setCount(value => Math.max(0, value + (result.following ? 1 : -1)));
  }

  return <button type="button" onClick={toggle} disabled={loading} aria-label={following ? 'Unfollow member' : 'Follow member'} style={{ border: following ? '1px solid var(--line)' : '1px solid var(--green)', background: following ? '#fff' : 'var(--green)', color: following ? 'var(--ink)' : '#fff', borderRadius: 999, padding: compact ? '7px 13px' : '9px 17px', fontSize: compact ? 11 : 12, fontWeight: 800, cursor: loading ? 'default' : 'pointer', opacity: loading ? .7 : 1, whiteSpace: 'nowrap' }}>
    {following ? 'Following' : 'Follow'}{compact ? '' : count > 0 ? ` · ${count}` : ''}
  </button>;
}
