import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable React compiler to avoid compatibility issues
  reactCompiler: false,
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Turbopack configuration for Next.js 16 (minimal to avoid warnings)
  turbopack: {},
  
  // Disable development indicators that cause source map issues
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  
  // Reduce logging to minimize console noise
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Disable source maps in production to prevent parsing issues
  productionBrowserSourceMaps: false,
  
  // Ensure no webpack configuration conflicts with Turbopack
  webpack: undefined,
  
  // Add error handling for unhandled rejections
  onDemandEntries: {
    // Reduce memory usage and potential JSON parsing conflicts
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
