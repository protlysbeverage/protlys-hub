'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function FirstVisitDashboard({ name, targetG }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('welcome')) {
      url.searchParams.delete('welcome');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  }, []);

  return (
    <section className="first-visit-dashboard" aria-label="Welcome to your dashboard">
      <div className="first-visit-greeting">
        <span className="mono first-visit-kicker">Welcome to Protlys</span>
        <h1>Hi, {name}</h1>
      </div>
      <div className="first-visit-target-card">
        <div>
          <div className="mono first-visit-label">Daily protein target</div>
          <div className="first-visit-target">{Number(targetG).toLocaleString()}<span className="mono"> g</span></div>
        </div>
        <span className="first-visit-saved">Saved</span>
      </div>
      <div className="first-visit-start">
        <div>
          <div className="mono first-visit-label">Get started</div>
          <h2>Make your first move</h2>
        </div>
        <Link href="/challenges" className="btn-primary first-visit-primary">Join a challenge</Link>
        <div className="first-visit-secondary-row">
          <Link href="/movement" className="btn-secondary">Movement</Link>
          <Link href="/" className="btn-secondary">Feed</Link>
        </div>
      </div>
    </section>
  );
}
