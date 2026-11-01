export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: 'Googlebot', allow: '/' },
    ],
    sitemap: 'https://hub.protlys.com/sitemap.xml',
    host: 'https://hub.protlys.com',
  };
}
