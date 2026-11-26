'use client';

export default function LoadingScreen() {
  return (
    <main
      role="status"
      aria-label="Loading Protlys"
      style={{
        minHeight: '100dvh',
        width: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        background: '#F7F8F6',
      }}
    >
      <div style={{ width: 'min(220px, 70vw)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <img
          src="/protlys-logo-exact.png"
          alt="Protlys"
          width="2000"
          height="973"
          fetchPriority="high"
          style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 112, objectFit: 'contain', objectPosition: 'center', padding: 12, boxSizing: 'border-box' }}
        />
        <div aria-hidden="true" style={{ width: 'min(148px, 72%)', height: 3, borderRadius: 99, overflow: 'hidden', background: 'rgba(79,159,53,.16)' }}>
          <div className="protlys-loading-progress" style={{ width: '0%', height: '100%', borderRadius: 99, background: '#6BCB45' }} />
        </div>
      </div>
      <style>{`
        @keyframes protlys-loading-fill {
          0% { width: 6%; }
          78% { width: 88%; }
          100% { width: 96%; }
        }
        .protlys-loading-progress { animation: protlys-loading-fill 2.4s cubic-bezier(.22,.7,.2,1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .protlys-loading-progress { animation: none; width: 72% !important; }
        }
      `}</style>
    </main>
  );
}
