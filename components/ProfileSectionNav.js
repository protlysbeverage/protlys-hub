'use client';

import { useEffect, useState } from 'react';

const sections = [
  ['posts', 'Posts'],
  ['stats', 'Stats'],
  ['photos', 'Photos'],
];

export default function ProfileSectionNav() {
  const [active, setActive] = useState('posts');

  useEffect(() => {
    const targets = sections
      .map(([id]) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { threshold: [0.15, 0.35, 0.6], rootMargin: '-105px 0px -35% 0px' }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Profile sections"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
        margin: '16px 0 4px',
        padding: 4,
        background: 'var(--green-soft)',
        borderRadius: 14,
        position: 'sticky',
        top: 76,
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,.04)',
      }}
    >
      {sections.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={active === id ? 'page' : undefined}
          style={{
            textAlign: 'center',
            padding: '9px 6px',
            borderRadius: 10,
            background: active === id ? '#fff' : 'transparent',
            color: active === id ? 'var(--ink)' : 'var(--green-dark)',
            textDecoration: 'none',
            fontSize: 11.5,
            fontWeight: 800,
            transition: 'background .18s ease, color .18s ease, box-shadow .18s ease',
            boxShadow: active === id ? '0 1px 4px rgba(0,0,0,.05)' : 'none',
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
