'use client';

import { useEffect, useRef, useState } from 'react';

const sections = [
  ['posts', 'Posts'],
  ['stats', 'Stats'],
  ['photos', 'Photos'],
  ['connections', 'Connections'],
];

export default function ProfileSectionNav() {
  const [active, setActive] = useState('posts');
  const sliderRef = useRef(null);

  useEffect(() => {
    const slider = document.querySelector('.profile-section-slider');
    if (!slider) return;
    sliderRef.current = slider;

    const updateActive = () => {
      const width = slider.clientWidth || 1;
      const index = Math.max(0, Math.min(sections.length - 1, Math.round(slider.scrollLeft / width)));
      setActive(sections[index][0]);
    };

    updateActive();
    slider.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);

    const openConnections = (event) => {
      const type = event.detail?.type === 'following' ? 'following' : 'followers';
      slider.scrollTo({
        left: slider.clientWidth * 3,
        behavior: 'smooth',
      });
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('protlys-open-connection-type', { detail: { type } })
        );
      }, 180);
    };

    window.addEventListener('protlys-profile-connections', openConnections);

    return () => {
      slider.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
      window.removeEventListener('protlys-profile-connections', openConnections);
    };
  }, []);

  const goToSection = (event, index, id) => {
    event.preventDefault();
    event.stopPropagation();

    const slider = sliderRef.current || document.querySelector('.profile-section-slider');
    if (!slider) return;

    const left = slider.clientWidth * index;
    setActive(id);
    slider.scrollTo({ left, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="Profile sections"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
        gap: 2,
        margin: '12px 0 5px',
        padding: 3,
        background: '#fff',
        border: '1px solid var(--line)',
        borderRadius: 12,
        position: 'sticky',
        top: 76,
        zIndex: 10,
        boxShadow: '0 2px 7px rgba(0,0,0,.035)',
      }}
    >
      {sections.map(([id, label], index) => (
        <button
          key={id}
          type="button"
          onClick={(event) => goToSection(event, index, id)}
          aria-current={active === id ? 'page' : undefined}
          style={{
            minWidth: 0,
            border: 0,
            textAlign: 'center',
            padding: '9px 3px',
            borderRadius: 9,
            background: active === id ? 'var(--green-soft)' : 'transparent',
            color: active === id ? 'var(--green-dark)' : 'var(--ink-45)',
            textDecoration: 'none',
            fontSize: 10.5,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            transition: 'background .18s ease,color .18s ease',
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
