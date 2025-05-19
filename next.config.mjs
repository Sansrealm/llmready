/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // GitHub Pages requires a trailing slash for proper routing
  trailingSlash: true,
  // Disable image optimization since GitHub Pages doesn't support it
  images: {
    unoptimized: true,
  },
  // Base path if deploying to a subdirectory
  // basePath: '/llmready',
};

export default nextConfig;
