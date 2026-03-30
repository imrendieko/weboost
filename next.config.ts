import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // For Pages Router with dynamic content, don't attempt prerendering
  experimental: {
    isrMemoryCacheSize: 50, // Cache ISR pages to reduce memory
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
  // Optimize for serverless deployment
  swcMinify: true,
};

export default nextConfig;
