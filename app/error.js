'use client';

import Link from 'next/link';

export default function Error({ reset }) {
  return (
    <div className="protlys-app">
      <main className="app-shell" style={{ justifyContent: 'center' }}>
        <section className="screen-pad" style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
          <img src="/protlys-logo-exact.png?v=3" alt="Protlys" style={{ width: 132, height: 'auto', objectFit: 'contain', margin: '0 auto 30px' }} />
          <p className="eyebrow">TEMPORARY ERROR</p>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, margin: '10px 0' }}>That didn't go to plan.</h1>
          <p className="subhead" style={{ margin: '0 auto 24px', maxWidth: 320 }}>
            Something went wrong on our side. Try again, or return to the Hub.
          </p>
          <div className="btn-row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={() => reset()}>Try again</button>
            <Link href="/" className="btn-secondary" style={{ display: 'inline-flex', textDecoration: 'none', alignItems: 'center', justifyContent: 'center' }}>
              Back to Hub
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
