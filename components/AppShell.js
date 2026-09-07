'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Feed', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg> },
  { href: '/movement', label: 'Movement', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1 8"/></svg> },
  { href: '/challenges', label: 'Challenges', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4h13l-2.5 4L17 12H4"/></svg> },
  { href: '/calculator', label: 'Protein', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h2"/></svg> },
  { href: '/account', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
];

function getShopUrl() { return 'https://protlys.com/collections/all'; }

function CartIcon({ size = 19 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 8H7" /></svg>;
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const shopUrl = getShopUrl();

  return <div className="protlys-app"><style>{`
    .protlys-app .hub-card .mono,.protlys-app .metric-number,.protlys-app .stat-number { font-family:'Space Grotesk',sans-serif!important;font-variant-numeric:tabular-nums;letter-spacing:-.025em; }
    .protlys-app .shop-header-link { display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font-size:11.5px;font-weight:800;text-decoration:none;transition:background .15s ease,border-color .15s ease,transform .15s ease; }
    .protlys-app .shop-header-link:hover { background:var(--green-soft);border-color:var(--green); }
    .protlys-app .shop-header-link:active { transform:scale(.98); }
    .protlys-app .movement-setting-card { background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px;margin-top:10px; }
    .protlys-app .movement-setting-head { display:flex;justify-content:space-between;gap:12px;align-items:flex-start; }
    .protlys-app .movement-setting-kicker { font-size:10px;letter-spacing:1.1px;text-transform:uppercase;color:var(--ink-45);font-weight:800; }
    .protlys-app .movement-setting-title { font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:750;margin-top:3px; }
    .protlys-app .movement-setting-value { font-size:12px;color:var(--ink-70);margin-top:3px; }
    .protlys-app .movement-setting-button { border:0;background:var(--green-soft);color:var(--green-dark);border-radius:999px;padding:8px 11px;font-size:11.5px;font-weight:800;white-space:nowrap;cursor:pointer; }
    .protlys-app button:has(svg[stroke-width="2.3"]) { color:#E1306C!important; }
    .protlys-app button:has(svg[stroke-width="2.3"]) svg { color:#E1306C; }
    .protlys-app button:has(svg[stroke-width="2.3"]) svg path { fill:#E1306C;stroke:#E1306C; }

    /* Feed cards: match the member-profile post mockup. */
    .protlys-app .feed-card { width:100%;margin:0 0 14px;padding:16px;background:#fff;border:1.5px solid var(--line);border-radius:18px;box-shadow:0 2px 8px rgba(15,42,74,.035);overflow:hidden; }
    .protlys-app .feed-card.profile-post-card { padding:18px!important;border-radius:20px!important;margin-bottom:14px!important;box-shadow:0 2px 10px rgba(15,42,74,.045)!important; }
    .protlys-app .profile-post-topline { display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 0 14px; }
    .protlys-app .profile-post-author { display:flex;align-items:center;gap:11px;min-width:0; }
    .protlys-app .profile-post-type { display:inline-flex;align-items:center;background:var(--green-soft);color:var(--green-dark);border-radius:999px;padding:6px 11px;font-size:11px;font-weight:800;white-space:nowrap; }
    .protlys-app .post-more-btn { width:32px;height:32px;padding:0;margin:0;border:0;background:transparent;color:var(--ink-45);display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer; }
    .protlys-app .post-more-btn:hover { background:var(--paper);color:var(--ink); }
    .protlys-app .post-menu { position:absolute;right:0;top:38px;z-index:30;width:148px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:5px; }
    .protlys-app .post-menu button { width:100%;display:flex;gap:8px;align-items:center;padding:9px 10px;border:0;background:transparent;cursor:pointer;border-radius:8px;font:inherit;text-align:left;color:var(--ink); }
    .protlys-app .post-menu button:hover { background:var(--paper); }
    .protlys-app .post-menu button.danger { color:#B3261E; }
    .protlys-app .feed-card-head { display:flex;align-items:center;gap:11px;min-height:44px;padding:0 0 13px;margin:0;border-bottom:0; }
    .protlys-app .feed-card-head>a { flex-shrink:0; }
    .protlys-app .feed-author { display:block;font-size:14px;line-height:1.25;font-weight:800;color:var(--ink); }
    .protlys-app .feed-meta { margin-top:4px;font-size:11px;line-height:1.2;color:var(--ink-45); }
    .protlys-app .feed-card-body { padding:0!important;font-size:15px;line-height:1.5; }
    .protlys-app .feed-card-body p { margin:0!important; }
    .protlys-app .feed-card-body img { display:block;width:100%;height:auto;max-height:520px;margin:12px 0 0;border-radius:14px;object-fit:cover;background:var(--paper); }
    .protlys-app .profile-post-engagement { border-top:1px solid var(--line);margin-top:16px;padding-top:12px; }
    .protlys-app .profile-post-actions { display:flex;align-items:center;gap:18px;min-height:30px; }
    .protlys-app .profile-action { display:inline-flex;align-items:center;gap:7px;padding:3px 0;border:0;background:transparent;color:var(--ink-60);font:inherit;font-size:14px;font-weight:700;cursor:pointer; }
    .protlys-app .profile-action:hover { color:var(--ink); }
    .protlys-app .profile-action.liked { color:#E1306C; }
    .protlys-app .profile-like-summary { margin-top:12px;font-size:14px;font-weight:800;color:var(--ink); }
    .protlys-app .profile-comments { margin-top:12px; }
    .protlys-app .profile-comment-input { position:relative; }
    .protlys-app .profile-comment-input .btn-secondary { flex:0 0 auto; }
    .protlys-app .feed-post-type-selector { display:flex;gap:6px;overflow-x:auto;margin:0 0 12px;padding:0 0 2px;scrollbar-width:none; }
    .protlys-app .feed-post-type-selector::-webkit-scrollbar { display:none; }
    .protlys-app .feed-post-type-selector button { flex:0 0 auto;border-radius:7px!important;padding:7px 12px!important;font-size:11.5px!important;line-height:18px; }
    .protlys-app .profile-comment a:hover { text-decoration:underline!important; }

    /* Restore the original five-tab mobile navigation: icon above label. */
    .protlys-app .bottom-nav { align-items:stretch!important; }
    .protlys-app .bottom-nav .nav-btn,.protlys-app .bottom-nav .nav-btn:link,.protlys-app .bottom-nav .nav-btn:visited,.protlys-app .bottom-nav .nav-btn:active { box-sizing:border-box!important;display:flex!important;flex:1 1 0!important;min-width:0!important;height:68px!important;padding:8px 2px 7px!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;font-family:'Manrope',sans-serif!important;font-size:10.5px!important;font-weight:700!important;line-height:1.05!important;letter-spacing:0!important;text-transform:none!important;text-align:center!important;white-space:nowrap!important;font-style:normal!important;font-variant:normal!important;margin:0!important;transform:none!important;color:var(--ink-45);text-decoration:none; }
    .protlys-app .bottom-nav .nav-btn.active { color:var(--green-dark)!important;font-weight:800!important; }
    .protlys-app .bottom-nav .nav-btn svg { flex:0 0 22px!important;width:22px!important;height:22px!important;display:block!important;margin:0!important; }
    .protlys-app .disclaimer { display:none!important; }

    .protlys-app .desktop-sidebar { display:none; }
    .protlys-app .brand-link { display:flex;align-items:center;justify-content:center;text-decoration:none; }
    .protlys-app .brand-link img { height:36px;width:auto;object-fit:contain;display:block; }

    @media (min-width:900px) {
      .protlys-app { min-height:100vh!important;background:#E4E3D6!important;display:flex!important;justify-content:center!important;align-items:flex-start!important;padding:28px!important; }
      .protlys-app .app-shell { width:min(1180px,100%)!important;max-width:none!important;min-height:calc(100vh - 56px)!important;height:auto!important;border-radius:28px!important;overflow:hidden!important;box-shadow:0 30px 70px -28px rgba(15,42,74,.35)!important;background:var(--paper)!important;display:grid!important;grid-template-columns:220px minmax(0,1fr)!important;grid-template-rows:auto 1fr!important; }
      .protlys-app .desktop-sidebar { grid-column:1;grid-row:1 / span 2;display:flex;flex-direction:column;padding:24px 14px;background:#fff;border-right:1px solid var(--line); }
      .protlys-app .sidebar-brand { display:flex;justify-content:center;align-items:center;padding:2px 12px 28px;border-bottom:1px solid var(--line); }
      .protlys-app .sidebar-brand img { width:126px;height:auto;display:block; }
      .protlys-app .sidebar-nav { display:flex;flex-direction:column;gap:4px;padding-top:22px; }
      .protlys-app .sidebar-nav .nav-btn { display:flex;align-items:center;gap:12px;width:100%;padding:11px 13px;border-radius:11px;color:var(--ink-70);font-size:12.5px;font-weight:750;text-decoration:none;transition:background .15s ease,color .15s ease; }
      .protlys-app .sidebar-nav .nav-btn svg { width:19px;height:19px;flex:0 0 19px; }
      .protlys-app .sidebar-nav .nav-btn:hover { background:var(--green-soft);color:var(--green-dark); }
      .protlys-app .sidebar-nav .nav-btn.active { background:var(--green-soft);color:var(--green-dark);font-weight:850; }
      .protlys-app .sidebar-spacer { flex:1; }
      .protlys-app .app-header { grid-column:2;grid-row:1;position:sticky!important;top:0!important;height:78px!important;padding:14px 28px!important;background:var(--paper)!important;display:grid!important;grid-template-columns:1fr auto 1fr!important;align-items:center!important;border-bottom:1px solid var(--line)!important; }
      .protlys-app .app-header > .brand-link { grid-column:2; }
      .protlys-app .app-header > .shop-header-link { grid-column:3;justify-self:end; }
      .protlys-app .app-header > a:first-child:not(.brand-link) { grid-column:2; }
      .protlys-app .brand-link img { height:42px!important; }
      .protlys-app .screen { grid-column:2;grid-row:2;display:block!important;width:100%;max-width:760px;margin:0 auto;overflow-y:auto;padding:0 24px 40px!important; }
      .protlys-app .bottom-nav { display:none!important; }
    }

    @media (max-width:899px) {
      .protlys-app .desktop-sidebar { display:none!important; }
      .protlys-app .app-header > a:first-child:not(.brand-link) { display:none!important; }
      .protlys-app .app-header { display:grid!important;grid-template-columns:1fr auto 1fr!important; }
      .protlys-app .app-header .brand-link { grid-column:2; }
      .protlys-app .app-header .shop-header-link { grid-column:3;justify-self:end; }
      .protlys-app .brand-link img { height:36px!important; }
    }
  `}</style>

  <div className="app-shell">
    <aside className="desktop-sidebar" aria-label="Protlys Hub navigation">
      <div className="sidebar-brand">
        <Link href="/" aria-label="Protlys Hub home"><img src="/protlys-logo.svg" alt="Protlys" /></Link>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => <Link key={item.href} href={item.href} className={`nav-btn${pathname===item.href?' active':''}`}>{item.icon}<span>{item.label}</span></Link>)}
      </nav>
      <div className="sidebar-spacer" />
    </aside>

    <div className="app-header">
      <Link className="brand-link" href="/" aria-label="Protlys Hub home"><img src="/protlys-logo.svg" alt="Protlys" /></Link>
      <a className="shop-header-link" href={shopUrl} aria-label="Shop Protlys" title="Shop Protlys"><CartIcon size={18}/><span>Shop Protlys</span></a>
    </div>

    <section className="screen active">{children}</section>

    <div className="bottom-nav">
      {NAV_ITEMS.map(item=><Link key={item.href} href={item.href} className={`nav-btn${pathname===item.href?' active':''}`}>{item.icon}<span>{item.label}</span></Link>)}
    </div>
  </div>
</div>;
}
