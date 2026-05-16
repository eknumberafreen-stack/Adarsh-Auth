/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        'adarshauth.online',
        'www.adarshauth.online',
        'adarsh-auth-frontend.up.railway.app',
        'adarsh-auth-frontend-production.up.railway.app'
      ]
    }
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'images2.imgbox.com' },
    ],
  },
}

module.exports = nextConfig
