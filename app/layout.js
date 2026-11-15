import './globals.css';
import './dark-mode.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource-variable/manrope';
import '@fontsource-variable/space-grotesk';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-mono/700.css';
import '@fontsource/anton';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';

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
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#F7F8F6" />
        <script dangerouslySetInnerHTML={{ __html: String.raw`(()=> {
          try {
            const root = document.documentElement;
            const saved = localStorage.getItem('protlys-theme');
            const dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
            root.dataset.theme = dark ? 'dark' : 'light';
            root.style.colorScheme = dark ? 'dark' : 'light';
            root.classList.toggle('protlys-dark', dark);
            window.__PROTLYS_BUILD_ID__ = '${BUILD_ID}';
            const retryChunk = async () => {
              try {
                if (sessionStorage.getItem('protlys-chunk-retry') === '1') return;
                sessionStorage.setItem('protlys-chunk-retry', '1');
                if ('serviceWorker' in navigator) {
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(registrations.map(registration => registration.unregister()));
                }
                window.location.reload();
              } catch {}
            };
            const isChunkFailure = event => {
              const target = event && event.target;
              const source = target && (target.src || target.href || '');
              const message = event && event.message || '';
              return (source && source.includes('/_next/static/chunks/')) || /ChunkLoadError|Loading chunk .* failed|Failed to load chunk/i.test(message);
            };
            window.addEventListener('error', event => {
              if (isChunkFailure(event)) retryChunk();
            }, true);
            window.addEventListener('unhandledrejection', event => {
              const reason = event && event.reason;
              if (reason && /ChunkLoadError|Loading chunk .* failed/i.test(String(reason.message || reason))) retryChunk();
            });
            window.addEventListener('load', () => {
              try { sessionStorage.removeItem('protlys-chunk-retry'); } catch {}
            }, { once: true });
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(registration => registration.update()).catch(() => {});
            }
          } catch {}
        })()` }} />
      </head>
      <body data-build-id={BUILD_ID}>{children}</body>
    </html>
  );
}
