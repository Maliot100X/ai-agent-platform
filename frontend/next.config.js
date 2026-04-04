/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/_/backend`
        : 'http://localhost:8000'
    ),
  },
};

module.exports = nextConfig;
