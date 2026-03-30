import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Explicit rewrites untuk Pages Router - pastikan static pages ter-serve dengan benar
  async rewrites() {
    return {
      beforeFiles: [
        // Public static pages
        { source: '/', destination: '/' },
        { source: '/login', destination: '/login' },
        { source: '/register', destination: '/register' },
      ],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
