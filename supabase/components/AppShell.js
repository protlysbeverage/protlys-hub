'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Hub',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>,
  },
  {
    href: '/movement',
    label: 'Movement',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  },
  {
    href: '/challenges',
    label: 'Challenges',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4h13l-2.5 4L17 12H4"/></svg>,
  },
  {
    href: '/community',
    label: 'Community',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="9" r="3.2"/><circle cx="16.5" cy="10" r="2.5"/><path d="M2.5 20c.6-3.4 3-5.4 5.5-5.4s4.9 2 5.5 5.4M14 20c.4-2.5 1.9-4.2 4-4.6c1.7-.3 3.3.4 4.5 1.7"/></svg>,
  },
  {
    href: '/account',
    label: 'Account',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>,
  },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const shopUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || '#';

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="protlys-app">
      <div className="app-shell">
        <div className="app-header">
          <div className="wordmark display">PROT<span>LYS</span></div>
          <div className="header-icons">
            <a className="icon-btn" href={shopUrl} aria-label="Shop on Protlys">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2l1.5 5h9L18 2" /><path d="M3.5 7h17l-1.2 12.2a2 2 0 0 1-2 1.8H6.7a2 2 0 0 1-2-1.8L3.5 7z" /></svg>
            </a>
            <button className="icon-btn" onClick={handleLogout} aria-label="Log out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>

        <section className="screen active">
          {children}
        </section>

        <div className="bottom-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-btn${pathname === item.href ? ' active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
