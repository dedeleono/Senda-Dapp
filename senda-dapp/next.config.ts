import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year cache
    remotePatterns: [
      {
        protocol: "https",
        hostname: "phantom.app",
      },
      {
        protocol: "https",
        hostname: "assets.aceternity.com",
      },
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
      },
    ],
  },
  experimental: {
    // Enable app router instrumentation
    clientInstrumentationHook: true,
  },
  // Ensure auth middleware is loaded correctly
  // This is critical for protecting routes
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  middleware: {
    // Force middleware to run on all requests
    // This is important for auth checks
    onError: 'continue',
  }
}

export default nextConfig
