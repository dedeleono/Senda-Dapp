import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  
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
    // Optimize package imports
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-slot'
    ],
    // Enable modern build optimizations
    serverComponentsExternalPackages: [],
  },

  // Webpack configuration for bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enable aggressive code splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 90000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Bundle core packages together
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|@radix-ui|framer-motion)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Group common utilities
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              priority: 20,
            },
            // Separate large libraries
            lib: {
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              name(module: any) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )[1]
                return `lib.${packageName.replace('@', '')}`
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
          },
        },
        runtimeChunk: { name: 'runtime' },
      }

      // Minimize JavaScript
      config.optimization.minimize = true
    }

    return config
  },

  // Ensure auth middleware is loaded correctly
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  middleware: {
    // Force middleware to run on all requests
    onError: 'continue',
  },

  // Performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Disable powered by header
  poweredByHeader: false,

  // Enable compression
  compress: true,

  // Increase build memory limit
  env: {
    NODE_OPTIONS: '--max-old-space-size=4096'
  },
}

export default nextConfig
