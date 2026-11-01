export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/'] },
      { userAgent: 'Googlebot', allow: '/', disallow: ['/api/', '/auth/'] },
    ],
    sitemap: 'https://hub.protlys.com/sitemap.xml',
  };
}
