'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Feed', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg> },
  { href: '/movement', label: 'Movement', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
  { href: '/challenges', label: 'Challenges', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4h13l-2.5 4L17 12H4"/></svg> },
  { href: '/events', label: 'Events', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { href: '/account', label: 'Account', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg> },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const shopUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || 'https://protlys.com';

  return (
    <div className="protlys-app">
      <style>{`
        .protlys-app .hub-card .mono,
        .protlys-app .metric-number,
        .protlys-app .stat-number {
          font-family: 'Space Grotesk', sans-serif !important;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.025em;
        }
        .protlys-app .milestone-status {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 800;
        }
        .protlys-app .milestone-status.done { background: var(--green); color: #fff; }
        .protlys-app .milestone-status.current { border: 2px solid var(--green); background: #fff; color: var(--green-dark); }
        .protlys-app .milestone-status.locked { background: rgba(15,42,74,.08); color: var(--ink-45); }
      `}</style>

      <div className="app-shell">
        <div className="app-header">
          <a href={shopUrl} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" alt="Protlys" style={{ height: 36, width: 'auto', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
          </a>
          <div className="header-icons">
            <a className="icon-btn" href={shopUrl} aria-label="Return to Protlys store" title="Return to store">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </a>
          </div>
        </div>
        <section className="screen active">{children}</section>
        <div className="bottom-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-btn${pathname === item.href ? ' active' : ''}`}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
