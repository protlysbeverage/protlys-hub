'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Feed', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg> },
  { href: '/movement', label: 'Movement', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1 8"/></svg> },
  { href: '/challenges', label: 'Challenges', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4h13l-2.5 4L17 12H4"/></svg> },
  { href: '/hub', label: 'Hub', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/></svg> },
  { href: '/account', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
];

function getShopUrl() {
  return 'https://protlys.com/collections/all';
}

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
  const shopUrl = getShopUrl();

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

        .protlys-app .feed-card {
          width:100%;
          margin:0 0 14px;
          padding:16px;
          background:#fff;
          border:1px solid var(--line);
          border-radius:18px;
          box-shadow:0 2px 8px rgba(15,42,74,.035);
          overflow:hidden;
        }
        .protlys-app .feed-card-head { display:flex;align-items:center;gap:10px;min-height:40px;padding:0 0 12px;margin:0;border-bottom:1px solid var(--line); }
        .protlys-app .feed-card-head > a { flex-shrink:0; }
        .protlys-app .feed-author { display:block;font-size:13px;line-height:1.25;font-weight:800;color:var(--ink); }
        .protlys-app .feed-meta { margin-top:3px;font-size:10.5px;line-height:1.2;color:var(--ink-45); }
        .protlys-app .feed-body { padding:12px 0 0;font-size:13.5px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere; }
        .protlys-app .feed-image { display:block;width:100%;height:auto;max-height:280px;margin:12px 0 0;border-radius:12px;object-fit:cover;background:var(--paper); }
        .protlys-app .feed-card .feed-actions { display:flex;align-items:center;gap:18px;margin-top:12px;padding-top:10px;border-top:1px solid var(--line); }
        .protlys-app .feed-card .feed-actions button { display:inline-flex;align-items:center;gap:6px; }
        .protlys-app .feed-card .feed-comments { margin-top:10px;padding-top:10px;border-top:1px solid var(--line); }
        .protlys-app .feed-post-type-selector { display:flex;gap:6px;overflow-x:auto;margin:0 0 12px;padding:0 0 2px;scrollbar-width:none; }
        .protlys-app .feed-post-type-selector::-webkit-scrollbar { display:none; }
        .protlys-app .feed-post-type-selector button { flex:0 0 auto;border-radius:7px !important;padding:7px 12px !important;font-size:11.5px !important;line-height:18px; }
      `}</style>
      <div className="app-shell">
        <div className="app-header">
          <a href={shopUrl} style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }} aria-label="Protlys store">
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
