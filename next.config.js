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
    // Simplified: just rely on outputFileTracingIncludes to include the data files
    // No need to modify externals
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

