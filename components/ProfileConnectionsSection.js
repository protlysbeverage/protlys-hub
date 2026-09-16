'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function ProfileConnectionsSection({ profileId, followersCount = 0, followingCount = 0 }) {
  const [type, setType] = useState('followers');
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const loaded = useRef({ followers: false, following: false });
  const drag = useRef(null);
  const suppressClick = useRef(false);

  const load = useCallback(async (nextType) => {
    if (loaded.current[nextType]) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/member/${profileId}/connections?type=${nextType}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load connections');
      const data = await response.json();
      if (nextType === 'following') setFollowing(data.users || []);
      else setFollowers(data.users || []);
      loaded.current[nextType] = true;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    load('followers');
    const timer = window.setTimeout(() => load('following'), 350);
    return () => window.clearTimeout(timer);
  }, [load]);

  const changeType = useCallback((nextType) => {
    const normalized = nextType === 'following' ? 'following' : 'followers';
    setType(normalized);
    setDragX(0);
    load(normalized);
  }, [load]);

  useEffect(() => {
    const openType = (event) => changeType(event.detail?.type);
    window.addEventListener('protlys-open-connection-type', openType);
    return () => window.removeEventListener('protlys-open-connection-type', openType);
  }, [changeType]);

  const beginDrag = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      active: false,
    };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;

    if (!current.active) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < 8) return;
      current.active = true;
      setIsDragging(true);
    }

    event.preventDefault();
    event.stopPropagation();
    current.lastX = event.clientX;
    setDragX(dx);
    suppressClick.current = true;
  };

  const endDrag = (event) => {
    const current = drag.current;
    if (!current) return;
    const dx = current.lastX - current.startX;
    const wasActive = current.active;
    drag.current = null;
    setIsDragging(false);

    if (wasActive) {
      event.preventDefault();
      event.stopPropagation();
      const threshold = Math.max(45, window.innerWidth * 0.12);
      if (Math.abs(dx) >= threshold) {
        changeType(dx < 0 ? 'following' : 'followers');
      } else {
        setDragX(0);
      }
      window.setTimeout(() => { suppressClick.current = false; }, 50);
    }
  };

  const cancelDrag = () => {
    drag.current = null;
    setIsDragging(false);
    setDragX(0);
  };

  const handleClickCapture = (event) => {
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
    }
  };

  const users = type === 'following' ? following : followers;
  const base = type === 'following' ? -50 : 0;

  return (
    <section id="connections" style={{ width: '100%', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => changeType('followers')}
          style={{ flex: 1, border: '1px solid #dce8df', borderRadius: 12, background: type === 'followers' ? '#eef8f0' : '#fff', padding: '10px 8px', cursor: 'pointer' }}
        >
          <strong style={{ display: 'block', fontSize: 18 }}>{followersCount}</strong>
          <span style={{ fontSize: 12, color: '#66736b' }}>Followers</span>
        </button>
        <button
          type="button"
          onClick={() => changeType('following')}
          style={{ flex: 1, border: '1px solid #dce8df', borderRadius: 12, background: type === 'following' ? '#eef8f0' : '#fff', padding: '10px 8px', cursor: 'pointer' }}
        >
          <strong style={{ display: 'block', fontSize: 18 }}>{followingCount}</strong>
          <span style={{ fontSize: 12, color: '#66736b' }}>Following</span>
        </button>
      </div>

      <div
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        onClickCapture={handleClickCapture}
        style={{ width: '100%', overflow: 'hidden', touchAction: 'pan-y', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      >
        <div
          style={{
            display: 'flex',
            width: '200%',
            transform: `translate3d(calc(${base}% + ${dragX}px), 0, 0)`,
            transition: isDragging ? 'none' : 'transform 260ms cubic-bezier(0.22,1,0.36,1)',
            willChange: 'transform',
          }}
        >
          <div style={{ width: '50%', flexShrink: 0, paddingRight: 8 }}>
            <ConnectionList users={followers} loading={loading && !loaded.current.followers} emptyText="No followers yet." />
          </div>
          <div style={{ width: '50%', flexShrink: 0, paddingLeft: 8 }}>
            <ConnectionList users={following} loading={loading && !loaded.current.following} emptyText="Not following anyone yet." />
          </div>
        </div>
      </div>
    </section>
  );
}

function ConnectionList({ users, loading, emptyText }) {
  if (loading) return <div style={{ padding: '24px 8px', textAlign: 'center', color: '#718078' }}>Loading…</div>;
  if (!users.length) return <div style={{ padding: '24px 8px', textAlign: 'center', color: '#718078' }}>{emptyText}</div>;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {users.map((user) => (
        <a key={user.id} href={`/member/${user.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 6px', borderRadius: 10, textDecoration: 'none', color: 'inherit' }}>
          <img src={user.avatar_url || '/logo.png'} alt="" loading="lazy" decoding="async" width="40" height="40" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 650, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || user.username || 'Protlys member'}</div>
            {user.username ? <div style={{ fontSize: 12, color: '#718078', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{user.username}</div> : null}
          </div>
        </a>
      ))}
    </div>
  );
}
