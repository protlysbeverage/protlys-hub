import './globals.css';
import './dark-mode.css';

const EXACT_LOGO = '/protlys-logo-exact.png?v=2';
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_ID || 'local';

export const metadata = {
  metadataBase: new URL('https://hub.protlys.com'),
  title: 'Protlys Hub',
  description: 'Your home for movement, protein tracking, challenges and the Protlys community.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/protlys-logo-exact.png?v=3',
    shortcut: '/protlys-logo-exact.png?v=3',
    apple: '/protlys-logo-exact.png?v=3',
  },
  openGraph: {
    title: 'Protlys Hub',
    description: 'Your home for movement, protein tracking, challenges and the Protlys community.',
    url: 'https://hub.protlys.com',
    siteName: 'Protlys Hub',
    images: [{ url: EXACT_LOGO, alt: 'Protlys' }],
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Protlys Hub',
    description: 'Your home for movement, protein tracking, challenges and the Protlys community.',
    images: [EXACT_LOGO],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Protlys Hub',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F5F6F1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preload" as="image" href="/protlys-logo-exact.png" fetchPriority="high" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: "(()=>{try{const buildId=process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_ID || 'local';window.__PROTLYS_BUILD_ID__=buildId;console.info('[Protlys Hub] build',buildId);if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});}if(window.caches){caches.keys().then(keys=>keys.filter(k=>/protlys|workbox|next-cache/i.test(k)).forEach(k=>caches.delete(k))).catch(()=>{});}const s=localStorage.getItem('protlys-theme');const d=s==='dark'||(!s&&matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('protlys-dark');document.documentElement.style.colorScheme='dark';}}catch(e){}})()" }} />
      </head>
      <body data-build-id={BUILD_ID}>{children}</body>
    </html>
  );
}
