/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-tweet', 'lite-youtube-embed'],
  images: {
    domains: ['www.notion.so', 's3.us-west-2.amazonaws.com', 'images.unsplash.com', 'i.ytimg.com'],
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // Include geoip-lite data files in Vercel serverless bundle
  experimental: {
    outputFileTracingIncludes: {
      '/api/**': ['./node_modules/geoip-lite/data/**'],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent geoip-lite from being externalized so its data files are included
      const originalExternals = config.externals;
      config.externals = [
        (context, request, callback) => {
          // Don't externalize geoip-lite - we need its data files bundled
          if (request && typeof request === 'string' && request.includes('geoip-lite')) {
            return callback();
          }
          // Use original externals logic for other modules
          if (typeof originalExternals === 'function') {
            return originalExternals(context, request, callback);
          }
          if (Array.isArray(originalExternals)) {
            for (const external of originalExternals) {
              if (typeof external === 'function') {
                const result = external(context, request, callback);
                if (result !== undefined) return result;
              }
            }
          }
          callback();
        },
      ];
    }
    return config;
  },
  // Temporary redirects
  async redirects() {
    return [
      {
        source: '/strategy-playing-to-win',
        destination: '/reading/strategy-playing-to-win',
        permanent: false, // 307 temporary redirect
      },
    ]
  },
}

module.exports = nextConfig

