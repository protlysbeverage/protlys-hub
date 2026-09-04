'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Feed', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg> },
  { href: '/movement', label: 'Movement', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1 8"/></svg> },
  { href: '/challenges', label: 'Challenges', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4h13l-2.5 4L17 12H4"/></svg> },
  { href: '/events', label: 'Events', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { href: '/account', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
];

function CartIcon({ size = 19 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 8H7" />
    </svg>
  );
}

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
        .protlys-app .shop-header-link {
          display:flex;align-items:center;gap:7px;padding:7px 10px;
          border:1px solid var(--line);border-radius:999px;background:#fff;
          color:var(--ink);font-size:11.5px;font-weight:800;text-decoration:none;
          transition:background .15s ease,border-color .15s ease,transform .15s ease;
        }
        .protlys-app .shop-header-link:hover { background:var(--green-soft);border-color:var(--green); }
        .protlys-app .shop-header-link:active { transform:scale(.98); }
        .protlys-app .movement-setting-card { background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px;margin-top:10px; }
        .protlys-app .movement-setting-head { display:flex;justify-content:space-between;gap:12px;align-items:flex-start; }
        .protlys-app .movement-setting-kicker { font-size:10px;letter-spacing:1.1px;text-transform:uppercase;color:var(--ink-45);font-weight:800; }
        .protlys-app .movement-setting-title { font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:750;margin-top:3px; }
        .protlys-app .movement-setting-value { font-size:12px;color:var(--ink-70);margin-top:3px; }
        .protlys-app .movement-setting-button { border:0;background:var(--green-soft);color:var(--green-dark);border-radius:999px;padding:8px 11px;font-size:11.5px;font-weight:800;white-space:nowrap;cursor:pointer; }
        .protlys-app button:has(svg[stroke-width="2.3"]) { color:#E1306C !important; }
        .protlys-app button:has(svg[stroke-width="2.3"]) svg { color:#E1306C; }
        .protlys-app button:has(svg[stroke-width="2.3"]) svg path { fill:#E1306C; stroke:#E1306C; }

        /* Feed post type selector: every option uses the same capsule geometry. */
        .protlys-app .screen-pad > div:first-child > div:nth-child(2) {
          display:flex !important;
          gap:7px !important;
          align-items:center;
          padding:2px !important;
          margin:16px 0 14px !important;
          border:0 !important;
          border-radius:0 !important;
          background:transparent !important;
          overflow-x:auto;
          scrollbar-width:none;
        }
        .protlys-app .screen-pad > div:first-child > div:nth-child(2)::-webkit-scrollbar { display:none; }
        .protlys-app .screen-pad > div:first-child > div:nth-child(2)::before { display:none; }
        .protlys-app .screen-pad > div:first-child > div:nth-child(2) button {
          flex:1 0 auto;
          min-width:0;
          height:34px;
          border:1px solid var(--line) !important;
          border-radius:999px !important;
          padding:7px 13px !important;
          font-size:11.5px !important;
          font-weight:750 !important;
          line-height:18px !important;
          white-space:nowrap;
          background:#fff !important;
          color:var(--ink-70) !important;
          box-sizing:border-box;
          transition:background .15s ease,color .15s ease,border-color .15s ease;
        }
        .protlys-app .screen-pad > div:first-child > div:nth-child(2) button:hover {
          background:var(--green-soft) !important;
          border-color:var(--green) !important;
          color:var(--green-dark) !important;
        }
        .protlys-app .screen-pad > div:first-child > div:nth-child(2) button:first-of-type {
          background:var(--green-soft) !important;
          border-color:var(--green) !important;
          color:var(--green-dark) !important;
        }
      `}</style>
      <div className="app-shell">
        <div className="app-header">
          <a href={shopUrl} style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
            <img src="/logo.png" alt="Protlys" style={{ height:36, width:'auto', objectFit:'contain' }} onError={e => { e.target.style.display='none'; }} />
          </a>
          <a className="shop-header-link" href={shopUrl} aria-label="Shop Protlys" title="Shop Protlys">
            <CartIcon size={18} />
            <span>Shop Protlys</span>
          </a>
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