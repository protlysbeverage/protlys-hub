/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  async rewrites() {
    return [
      { source: '/logo.png', destination: '/protlys-logo.svg' },
    ];
  },
};

export default nextConfig;
