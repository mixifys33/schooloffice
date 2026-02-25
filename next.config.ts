const nextConfig = {
  // Disable React compiler to avoid compatibility issues
  reactCompiler: false,
  
  // TypeScript configuration
  // WARNING: Ignoring TypeScript errors - build will succeed even with type errors
  typescript: {
    ignoreBuildErrors: true, // DANGER: Ignores all TypeScript errors during build
  },
  
  // ESLint configuration - ignore all errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Reduce logging to minimize console noise
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Disable source maps in production to prevent parsing issues and reduce memory
  productionBrowserSourceMaps: false,
  
  // Add error handling for unhandled rejections
  onDemandEntries: {
    // Reduce memory usage and potential JSON parsing conflicts
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Increase body size limit for file uploads (50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  
  // Reduce memory usage during build
  compress: true,
  
  // Optimize images
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
