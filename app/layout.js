import './globals.css';
import './dark-mode.css';
import '@fontsource-variable/manrope';
import '@fontsource-variable/space-grotesk';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-mono/700.css';
import '@fontsource/anton';

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
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#F7F8F6" />
        <script dangerouslySetInnerHTML={{ __html: "(()=>{try{const root=document.documentElement;const saved=localStorage.getItem('protlys-theme');const dark=saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme: dark)').matches);root.dataset.theme=dark?'dark':'light';root.style.colorScheme=dark?'dark':'light';root.classList.toggle('protlys-dark',dark);const buildId='"+BUILD_ID+"';window.__PROTLYS_BUILD_ID__=buildId;console.info('[Protlys Hub] build',buildId);if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});}}catch(e){}})()" }} />
      </head>
      <body data-build-id={BUILD_ID}>{children}</body>
    </html>
  );
}
