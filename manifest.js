export default function manifest() {
  return {
    id: '/',
    name: 'Protlys Hub',
    short_name: 'Protlys',
    description: 'Your home for movement, protein tracking, challenges and the Protlys community.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F7F8F6',
    theme_color: '#F7F8F6',
    lang: 'en-KE',
    categories: ['health', 'fitness', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
