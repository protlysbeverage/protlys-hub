'use client';

export default function LoadingScreen({ label = 'Loading Protlys Hub' } = {}) {
  return (
    <main
      role="status"
      aria-label={label}
      aria-busy="true"
      className="protlys-loading-screen"
    >
      <div className="protlys-loading-content">
        <span className="protlys-loading-label">{label}</span>
        <div
          className="protlys-loading-track"
          role="progressbar"
          aria-label="Page loading progress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span className="protlys-loading-progress" />
        </div>
      </div>
      <style>{`
        .protlys-loading-screen {
          min-height: 100dvh;
          width: 100%;
          display: grid;
          place-items: center;
          padding: 24px;
          box-sizing: border-box;
          background: #F7F8F6;
          color: #24352A;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .protlys-loading-content {
          width: min(240px, 72vw);
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 16px;
        }
        .protlys-loading-label {
          color: #526257;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: .01em;
          text-align: center;
        }
        .protlys-loading-track {
          width: 100%;
          height: 4px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(79,159,53,.16);
        }
        .protlys-loading-progress {
          display: block;
          width: 0;
          height: 100%;
          border-radius: inherit;
          background: #6BCB45;
          animation: protlys-loading-fill 2.4s cubic-bezier(.22,.7,.2,1) infinite;
          will-change: width;
        }
        @keyframes protlys-loading-fill {
          0% { width: 4%; transform: translateX(0); }
          65% { width: 78%; }
          100% { width: 96%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .protlys-loading-progress { animation: none; width: 72%; }
        }
      `}</style>
    </main>
  );
}
