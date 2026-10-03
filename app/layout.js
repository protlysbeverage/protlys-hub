import './globals.css';
import './dark-mode.css';
import Script from 'next/script';

const EXACT_LOGO='/protlys-logo-exact.png?v=2';
const BUILD_ID=process.env.VERCEL_GIT_COMMIT_SHA||process.env.NEXT_PUBLIC_BUILD_ID||'local';

export const metadata={
  metadataBase:new URL('https://hub.protlys.com'),
  title:'Protlys Hub',
  description:'Your home for movement, protein tracking, challenges and the Protlys community.',
  manifest:'/manifest.webmanifest',
  icons:{icon:'/protlys-logo-exact.png?v=3',shortcut:'/protlys-logo-exact.png?v=3',apple:'/protlys-logo-exact.png?v=3'},
  openGraph:{title:'Protlys Hub',description:'Your home for movement, protein tracking, challenges and the Protlys community.',url:'https://hub.protlys.com',siteName:'Protlys Hub',images:[{url:EXACT_LOGO,alt:'Protlys'}],locale:'en_KE',type:'website'},
  twitter:{card:'summary_large_image',title:'Protlys Hub',description:'Your home for movement, protein tracking, challenges and the Protlys community.',images:[EXACT_LOGO]},
  appleWebApp:{capable:true,statusBarStyle:'default',title:'Protlys Hub'},
};

export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#F5F6F1'};

const themeScript="(()=>{try{const key='protlys-theme';const saved=localStorage.getItem(key);const dark=saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme: dark)').matches);const theme=dark?'dark':'light';const root=document.documentElement;root.setAttribute('data-theme',theme);root.classList.toggle('protlys-dark',dark);root.style.colorScheme=theme;const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.setAttribute('content',dark?'#0D0F0E':'#F5F6F1');}catch(e){}})()";

export default function RootLayout({children}){
  return <html lang="en" suppressHydrationWarning>
    <head>
      <meta name="color-scheme" content="dark light"/>
      <meta name="theme-color" content="#F5F6F1"/>
      <Script id="protlys-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{__html:themeScript}}/>
      <style dangerouslySetInnerHTML={{__html:'html{background:#F5F6F1}html[data-theme="dark"]{background:#0D0F0E}'}}/>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preload" as="image" href="/protlys-logo-exact.png" fetchPriority="high"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap" rel="stylesheet"/>
    </head>
    <body data-build-id={BUILD_ID}>
      <script dangerouslySetInnerHTML={{__html:"(()=>{try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});}if(window.caches){caches.keys().then(keys=>keys.filter(k=>/protlys|workbox|next-cache/i.test(k)).forEach(k=>caches.delete(k))).catch(()=>{});}}catch(e){}})()"}}/>
      {children}
    </body>
  </html>;
}
