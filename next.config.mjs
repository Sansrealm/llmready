/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // ✅ allow API routes
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // basePath: '/llmready', // keep this commented unless needed
};

export default nextConfig;