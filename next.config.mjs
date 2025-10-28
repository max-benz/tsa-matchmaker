/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'liogapsqhkualetfswel.supabase.co',
      },
    ],
  },
  // Production optimizations
  swcMinify: true,
  poweredByHeader: false,
};

export default nextConfig;
