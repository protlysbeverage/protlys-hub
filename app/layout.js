import './globals.css';
import './dark-mode.css';

const EXACT_LOGO = '/protlys-logo-exact.png?v=2';

export const metadata = {
  metadataBase: new URL('https://hub.protlys.com'),
  title: 'Protlys Hub',
  description: 'Your home for movement, protein tracking, challenges and the Protlys community.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/protlys-logo-exact.png',
    shortcut: '/protlys-logo-exact.png',
    apple: '/protlys-logo-exact.png',
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: `(()=>{try{const s=localStorage.getItem('protlys-theme');const d=s==='dark'||(!s&&matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('protlys-dark');document.documentElement.style.colorScheme='dark';}}catch(e){}})()` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
