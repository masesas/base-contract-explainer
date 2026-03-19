/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output untuk deployment yang lebih efisien di Vercel/Docker
  output: 'standalone',

  experimental: {
    serverComponentsExternalPackages: ['viem'],
  },
};

module.exports = nextConfig;