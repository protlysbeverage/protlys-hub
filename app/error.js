'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Keep diagnostic details out of the interface; production monitoring can
    // be connected separately without exposing internal errors to members.
    console.error('Protlys Hub application error.');
  }, [error]);

  return (
    <div className="protlys-app">
      <main className="app-shell" style={{ justifyContent: 'center' }}>
        <section className="screen-pad" style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
          <img
            src="/protlys-logo-exact.png?v=3"
            alt="Protlys"
            style={{ width: 132, height: 'auto', objectFit: 'contain', margin: '0 auto 30px' }}
          />
          <p className="eyebrow">TEMPORARY ERROR</p>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, margin: '10px 0' }}>That didn't go to plan.</h1>
          <p className="subhead" style={{ margin: '0 auto 24px', maxWidth: 320 }}>
            Something went wrong on our side. Try again, or return to the Hub.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="primary-btn" onClick={() => reset()}>
              Try again
            </button>
            <Link href="/" className="secondary-btn" style={{ display: 'inline-flex', textDecoration: 'none', alignItems: 'center', justifyContent: 'center' }}>
              Back to Hub
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
