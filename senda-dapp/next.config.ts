import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
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
      {
        protocol: "https",
        hostname: "d7f32j3r8phi2.cloudfront.net",
      },
    ],
  },
  experimental: {
    // Enable app router instrumentation
  },
  appDir: true,
  output: 'standalone',

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
