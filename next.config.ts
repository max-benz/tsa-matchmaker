import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'liogapsqhkualetfswel.supabase.co',
      },
    ],
  },
};

export default nextConfig;
