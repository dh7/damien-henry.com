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
  // Temporary redirects
  async redirects() {
    return [
      {
        source: '/strategy-playing-to-win',
        destination: '/',
        permanent: false, // 307 temporary redirect
      },
    ]
  },
}

module.exports = nextConfig

