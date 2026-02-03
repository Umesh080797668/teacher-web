import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Netlify deployment optimizations
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checks enabled
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react', 'recharts'],
  },
  // Compression and caching
  compress: true,
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
  },
};

export default nextConfig;
