import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Netlify deployment optimizations
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checks enabled
  },
};

export default nextConfig;
