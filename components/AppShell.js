'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

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

function AiIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="4"/><path d="M8 12h.01M12 12h.01M16 12h.01M9 19v2M15 19v2"/></svg>;
}

function BookIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h8"/></svg>;
}

function ChevronIcon({ open }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} /></svg>;
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const shopUrl = getShopUrl();
  const [libraryOpen, setLibraryOpen] = useState(pathname === '/library');

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
    .protlys-app .feed-card { width:100%;margin:0 0 14px;padding:16px;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 2px 8px rgba(15,42,74,.035);overflow:hidden; }
    .protlys-app .feed-card-head { display:flex;align-items:center;gap:10px;min-height:40px;padding:0 0 12px;margin:0;border-bottom:1px solid var(--line); }
    .protlys-app .feed-card-head>a { flex-shrink:0; }
    .protlys-app .feed-author { display:block;font-size:13px;line-height:1.25;font-weight:800;color:var(--ink); }
    .protlys-app .feed-meta { margin-top:3px;font-size:10.5px;line-height:1.2;color:var(--ink-45); }
    .protlys-app .feed-body { padding:12px 0 0;font-size:13.5px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere; }
    .protlys-app .feed-image { display:block;width:100%;height:auto;max-height:280px;margin:12px 0 0;border-radius:12px;object-fit:cover;background:var(--paper); }
    .protlys-app .feed-card .feed-actions { display:flex;align-items:center;gap:18px;margin-top:12px;padding-top:10px;border-top:1px solid var(--line); }
    .protlys-app .feed-card .feed-actions button { display:inline-flex;align-items:center;gap:6px; }
    .protlys-app .feed-card .feed-comments { margin-top:8px;padding-top:8px;border-top:0; }
    .protlys-app .profile-post-card { overflow:hidden; }
    .protlys-app .profile-post-engagement { border-top:1px solid var(--line)!important; margin-top:10px!important; padding-top:10px!important; }
    .protlys-app .profile-post-actions { min-height:28px; }
    .protlys-app .feed-post-type-selector { display:flex;gap:6px;overflow-x:auto;margin:0 0 12px;padding:0 0 2px;scrollbar-width:none; }
    .protlys-app .feed-post-type-selector::-webkit-scrollbar { display:none; }
    .protlys-app .feed-post-type-selector button { flex:0 0 auto;border-radius:7px!important;padding:7px 12px!important;font-size:11.5px!important;line-height:18px; }
    .protlys-app .library-feature-card { display:flex;gap:18px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 2px 8px rgba(15,42,74,.035); }
    .protlys-app .library-icon { width:46px;height:46px;min-width:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--green-soft);color:var(--green-dark); }
    .protlys-app .library-icon svg { width:23px;height:23px; }
    .protlys-app .library-kicker { font-size:10px;line-height:1.2;letter-spacing:1.1px;text-transform:uppercase;color:var(--ink-45);font-weight:800; }
    .protlys-app .library-feature-copy h2 { margin:4px 0 6px;font-family:'Space Grotesk',sans-serif;font-size:20px;line-height:1.15;letter-spacing:-.02em; }
    .protlys-app .library-feature-copy p,.protlys-app .library-coming-card p { margin:0;color:var(--ink-70);font-size:13px;line-height:1.55; }
    .protlys-app .library-primary-link { display:inline-flex;align-items:center;gap:7px;margin-top:16px;color:var(--green-dark);font-size:12px;font-weight:800;text-decoration:none; }
    .protlys-app .library-primary-link:hover { text-decoration:underline; }
    .protlys-app .library-coming-card { margin-top:12px;background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:17px; }
    .protlys-app .library-coming-card h3 { margin:4px 0 5px;font-family:'Space Grotesk',sans-serif;font-size:15px; }
    .protlys-app .bottom-nav { align-items:stretch!important; }
    .protlys-app .bottom-nav .nav-btn,.protlys-app .bottom-nav .nav-btn:link,.protlys-app .bottom-nav .nav-btn:visited,.protlys-app .bottom-nav .nav-btn:active { box-sizing:border-box!important;display:flex!important;flex:1 1 0!important;min-width:0!important;height:52px!important;padding:7px 2px 6px!important;align-items:center!important;justify-content:center!important;gap:4px!important;font-family:'Manrope',sans-serif!important;font-size:10px!important;font-weight:700!important;line-height:1!important;letter-spacing:0!important;text-transform:none!important;text-align:center!important;white-space:nowrap!important;font-style:normal!important;font-variant:normal!important;margin:0!important;transform:none!important; }
    .protlys-app .bottom-nav .nav-btn svg { flex:0 0 20px!important;width:20px!important;height:20px!important;display:block!important;margin:0!important; }
    .protlys-app .disclaimer { display:none!important; }
    .protlys-app .desktop-sidebar { display:none; }
    .protlys-app .desktop-ai { display:none; }
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
      .protlys-app .sidebar-nav .nav-btn.ai-coming { cursor:default;color:var(--ink-45); }
      .protlys-app .sidebar-nav .nav-btn.ai-coming:hover { background:var(--paper);color:var(--ink-45); }
      .protlys-app .sidebar-nav .nav-btn.ai-coming .nav-coming { margin-left:auto;font-size:8px;line-height:1;text-transform:uppercase;letter-spacing:.5px;padding:4px 5px;border:1px solid var(--line);border-radius:5px;font-weight:800; }
      .protlys-app .sidebar-spacer { flex:1; }
      .protlys-app .desktop-ai { display:flex;align-items:center;gap:10px;padding:12px;border:1px dashed var(--line);border-radius:13px;background:var(--paper);color:var(--ink-70); }
      .protlys-app .desktop-ai .ai-icon { width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#fff;color:var(--green-dark);border:1px solid var(--line);flex:0 0 34px; }
      .protlys-app .desktop-ai .ai-icon svg { width:18px;height:18px; }
      .protlys-app .desktop-ai .ai-title { font-size:12px;font-weight:850;color:var(--ink); }
      .protlys-app .desktop-ai .ai-meta { font-size:9.5px;margin-top:2px;color:var(--ink-45);font-weight:700; }
      .protlys-app .app-header { grid-column:2;grid-row:1;position:sticky!important;top:0!important;height:78px!important;padding:14px 28px!important;background:var(--paper)!important;display:grid!important;grid-template-columns:1fr auto 1fr!important;align-items:center!important;border-bottom:1px solid var(--line)!important; }
      .protlys-app .app-header > .brand-link { grid-column:2; }
      .protlys-app .app-header > .shop-header-link { grid-column:3;justify-self:end; }
      .protlys-app .brand-link img { height:42px!important; }
      .protlys-app .screen { grid-column:2;grid-row:2;display:block!important;width:100%;max-width:760px;margin:0 auto;overflow-y:auto;padding:0 24px 40px!important; }
      .protlys-app .bottom-nav { display:none!important; }
      .protlys-app .library-dropdown-wrap { width:100%; }
      .protlys-app .library-dropdown-trigger { justify-content:flex-start!important;cursor:pointer;background:none;border:0;text-align:left;font-family:inherit; }
      .protlys-app .library-dropdown-trigger .library-chevron { margin-left:auto;width:15px!important;height:15px!important;flex:0 0 15px!important; }
      .protlys-app .library-dropdown { margin:0 0 4px 44px;padding:3px 0 3px 11px;border-left:1px solid var(--line);display:flex;flex-direction:column;gap:2px; }
      .protlys-app .library-dropdown-link { display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;color:var(--ink-70);font-size:11px;font-weight:750;text-decoration:none; }
      .protlys-app .library-dropdown-link:hover { background:var(--green-soft);color:var(--green-dark); }
      .protlys-app .library-dropdown-link.active { color:var(--green-dark);font-weight:850;background:var(--green-soft); }
      .protlys-app .library-dropdown-link.coming { cursor:default;color:var(--ink-45); }
      .protlys-app .library-dropdown-link.coming:hover { background:var(--paper);color:var(--ink-45); }
      .protlys-app .library-dropdown-link .coming-label { margin-left:auto;font-size:7.5px;text-transform:uppercase;letter-spacing:.5px;padding:3px 4px;border:1px solid var(--line);border-radius:4px;font-weight:800; }
    }
    @media (max-width:899px) {
      .protlys-app .desktop-sidebar { display:none!important; }
      .protlys-app .app-header { display:grid!important;grid-template-columns:1fr auto 1fr!important; }
      .protlys-app .app-header .brand-link { grid-column:2; }
      .protlys-app .app-header .shop-header-link { grid-column:3;justify-self:end; }
      .protlys-app .brand-link img { height:36px!important; }
    }
  `}</style>

  <div className="app-shell">
    <aside className="desktop-sidebar" aria-label="Protlys Hub navigation">
      <div className="sidebar-brand"><Link href="/" aria-label="Protlys Hub home"><img src="/protlys-logo.svg" alt="Protlys" /></Link></div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => <Link key={item.href} href={item.href} className={`nav-btn${pathname===item.href?' active':''}`}>{item.icon}<span>{item.label}</span></Link>)}
        <div className="library-dropdown-wrap">
          <button type="button" className={`nav-btn library-dropdown-trigger${pathname === '/library' ? ' active' : ''}`} onClick={() => setLibraryOpen(open => !open)} aria-expanded={libraryOpen} aria-controls="protlys-library-menu">
            <BookIcon /><span>Library</span><ChevronIcon open={libraryOpen} />
          </button>
          {libraryOpen && <div id="protlys-library-menu" className="library-dropdown">
            <Link href="/library" className={`library-dropdown-link${pathname === '/library' ? ' active' : ''}`}><span>Library</span></Link>
            <div className="library-dropdown-link coming"><span>Coming Soon</span><span className="coming-label">Soon</span></div>
            <div className="library-dropdown-link coming"><AiIcon /><span>Prot AI</span><span className="coming-label">Coming Soon</span></div>
          </div>}
        </div>
      </nav>
      <div className="sidebar-spacer" />
      <div className="desktop-ai" aria-label="Prot AI coming soon">
        <div className="ai-icon"><AiIcon /></div>
        <div><div className="ai-title">Prot AI</div><div className="ai-meta">Your nutrition companion · Coming soon</div></div>
      </div>
    </aside>

    <div className="app-header">
      <Link className="brand-link" href="/" aria-label="Protlys Hub home"><img src="/protlys-logo.svg" alt="Protlys" /></Link>
      <a className="shop-header-link" href={shopUrl} aria-label="Shop Protlys" title="Shop Protlys"><CartIcon size={18}/><span>Shop Protlys</span></a>
    </div>

    <section className="screen active">{children}</section>

    <div className="bottom-nav">
      {NAV_ITEMS.map(item=><Link key={item.href} href={item.href} className={`nav-btn${pathname===item.href?' active':''}`}>{item.icon}{item.label}</Link>)}
    </div>
  </div>
</div>;
