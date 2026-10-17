/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' https://accounts.google.com",
      "img-src 'self' data: blob: https://*.supabase.co https://cdn.shopify.com https://*.shopifycdn.com",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
      "frame-src 'self' https://accounts.google.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://protlys.com https://*.myshopify.com",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
    ].join('; '),
  },
];

const nextConfig = {
  experimental: {
    serverActions: {
      // Keep below Vercel's request-body ceiling. Client image compression targets <= 3 MB.
      bodySizeLimit: '4mb',
    },
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/assets/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          ...securityHeaders,
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
      {
        source: '/((?!_next/static|assets).*)',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/logo.png', destination: '/protlys-logo-exact.png?v=2' },
    ];
  },
};

export default nextConfig;
