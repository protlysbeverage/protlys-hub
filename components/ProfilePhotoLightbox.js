'use client';

import { useEffect, useState } from 'react';

export default function ProfilePhotoLightbox({ name, url, size = 72, className, style }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  const baseStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
    flexShrink: 0,
    cursor: url ? 'pointer' : 'default',
    ...style,
  };

  const fallback = (
    <div style={{ ...baseStyle, background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 800, color: 'var(--green-dark)' }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );

  return (
    <>
      {url ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`View ${name || 'member'} profile photo`}
          className={className}
          style={{ border: 0, padding: 0, margin: 0, background: 'transparent', borderRadius: '50%', lineHeight: 0, flexShrink: 0 }}
        >
          <img src={url} alt={`${name || 'Member'} profile`} style={baseStyle} />
        </button>
      ) : fallback}

      {open && url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name || 'Member'} profile photo`}
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}
        >
          <button
            type="button"
            aria-label="Close photo"
            onClick={() => setOpen(false)}
            style={{ position: 'absolute', top: 18, right: 18, width: 44, height: 44, border: 0, borderRadius: '50%', background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 28, lineHeight: 1, cursor: 'pointer' }}
          >
            ×
          </button>
          <img
            src={url}
            alt={`${name || 'Member'} profile`}
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 'min(88vw, 520px)', maxHeight: '82vh', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 14, display: 'block', boxShadow: '0 12px 40px rgba(0,0,0,.35)', cursor: 'default' }}
          />
        </div>
      )}
    </>
  );
}
