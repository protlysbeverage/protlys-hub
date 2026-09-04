'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Icon({ name, size = 19 }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    feed: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
    movement: <><path d="M13 2 3 14h9l-1 8 10-12h-9l1 8" /></>,
    challenges: <><path d="M4 22V4h13l-2.5 4L17 12H4" /></>,
    events: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    community: <><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 20c.5-3.2 2.5-5 6-5s5.5 1.8 6 5M14.5 15.5c2.5-.2 4.5 1.3 5 3.5" /></>,
    account: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const MAIN_NAV = [
  { href: '/hub', label: 'Dashboard', icon: 'dashboard' },
  { href: '/', label: 'Feed', icon: 'feed' },
  { href: '/movement', label: 'Movement', icon: 'movement' },
  { href: '/challenges', label: 'Challenges', icon: 'challenges' },
  { href: '/events', label: 'Events', icon: 'events' },
  { href: '/community', label: 'Community', icon: 'community' },
];

const ACCOUNT_NAV = [
  { href: '/account', label: 'Account', icon: 'account' },
];

function CartIcon({ size = 18 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 8H7" /></svg>;
}

function NavLink({ item, pathname, mobile = false }) {
  const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return <Link href={item.href} className={`protlys-nav-link${active ? ' active' : ''}${mobile ? ' mobile' : ''}`}><Icon name={item.icon} size={mobile ? 18 : 19} /><span>{item.label}</span></Link>;
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const shopUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || 'https://protlys.com';

  return (
    <div className="protlys-app">
      <style>{`
        .protlys-app .desktop-sidebar{display:none}
        .protlys-app .desktop-main{display:flex;flex:1;min-width:0}
        .protlys-app .desktop-content{min-width:0;flex:1;display:flex;flex-direction:column}
        .protlys-app .mobile-bottom-nav{display:flex}
        .protlys-app .protlys-nav-link{display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:12px;color:var(--ink-70);font-size:13px;font-weight:750;transition:background .15s ease,color .15s ease;text-decoration:none}
        .protlys-app .protlys-nav-link:hover,.protlys-app .protlys-nav-link.active{background:var(--green-soft);color:var(--green-dark)}
        .protlys-app .sidebar-section-label{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-45);font-weight:700;margin:22px 12px 7px}
        .protlys-app .sidebar-shop{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:auto;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);font-size:12px;font-weight:800;text-decoration:none}
        .protlys-app .sidebar-shop:hover{border-color:var(--green);background:var(--green-soft)}
        @media (min-width:900px){
          .protlys-app{min-height:100vh;background:#E4E3D6;padding:0}
          .protlys-app .app-shell{max-width:1280px;min-height:100vh;border-radius:0;box-shadow:none;background:var(--paper)}
          .protlys-app .desktop-sidebar{display:flex;width:226px;flex:0 0 226px;border-right:1px solid var(--line);background:#fff;padding:18px 14px;flex-direction:column;position:sticky;top:0;height:calc(100vh - 68px)}
          .protlys-app .desktop-main{min-height:calc(100vh - 68px)}
          .protlys-app .desktop-content .screen{max-width:920px;width:100%;margin:0 auto}
          .protlys-app .mobile-bottom-nav{display:none}
        }
      `}</style>

      <div className="app-shell">
        <header className="app-header">
          <Link href="/hub" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none'}} aria-label="Protlys Hub dashboard">
            <img src="/logo.png" alt="Protlys" style={{height:36,width:'auto',objectFit:'contain'}} onError={e => { e.currentTarget.style.display='none'; }} />
          </Link>
          <a className="shop-header-link" href={shopUrl} aria-label="Shop Protlys" title="Shop Protlys"><CartIcon /><span>Shop Protlys</span></a>
        </header>

        <div className="desktop-main">
          <aside className="desktop-sidebar" aria-label="Protlys Hub navigation">
            <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:16,fontWeight:800,padding:'2px 12px 8px'}}>Protlys Hub</div>
            <div className="sidebar-section-label" style={{marginTop:8}}>Hub</div>
            {MAIN_NAV.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
            <div className="sidebar-section-label">Account</div>
            {ACCOUNT_NAV.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
            <a className="sidebar-shop" href={shopUrl} target="_blank" rel="noopener"><CartIcon size={16} /> Shop Protlys</a>
          </aside>

          <main className="desktop-content"><section className="screen active">{children}</section></main>
        </div>

        <nav className="mobile-bottom-nav" aria-label="Primary navigation">
          {[MAIN_NAV[0], MAIN_NAV[1], MAIN_NAV[2], MAIN_NAV[3], ACCOUNT_NAV[0]].map(item => <NavLink key={item.href} item={item} pathname={pathname} mobile />)}
        </nav>
      </div>
    </div>
  );
}
