/** @type {import('next').NextConfig} */

const CLERK_FRONTEND_API = 'https://clerk.llmcheck.app';
const MAIN_API_DOMAIN = 'https://www.llmcheck.app';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval'"}
    https://challenges.cloudflare.com
    https://www.googletagmanager.com
    https://www.google-analytics.com
    https://analytics.google.com
    https://*.clerk.com
    https://*.clerk.dev
    https://*.clerk.accounts.dev
    https://js.stripe.com
    https://*.stripe.com
    https://vercel.live;
  connect-src 'self'
    https://clerk.llmcheck.app
    https://www.llmcheck.app
    https://api.clerk.com
    https://clerk-telemetry.com
    https://*.clerk.accounts.dev
    https://*.clerk.com
    https://*.clerk.dev
    https://analytics.google.com
    https://*.stripe.com
    https://vercel.live;
  img-src 'self' 
    https://img.clerk.com 
    https://*.clerk.com 
    https://analytics.google.com
    https://*.stripe.com
    https://vercel.com
    data: blob:;
  worker-src 'self' blob:;
  style-src 'self' 'unsafe-inline';
  frame-src 'self'
    https://challenges.cloudflare.com
    https://*.clerk.com
    https://*.clerk.dev
    https://*.clerk.accounts.dev
    https://checkout.stripe.com
    https://js.stripe.com
    https://vercel.live;
  form-action 'self' https://checkout.stripe.com;
  font-src 'self' data:;
  media-src 'self';
  object-src 'none';
  base-uri 'self';
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: { unoptimized: true },

  async headers() {
    return [
      {
        // 1. BYPASS FOR STATIC ASSETS: Fixes the "Lost Design" / MIME errors
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
          }
        ],
      },
      {
        // 2. GLOBAL SECURITY HEADERS
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ],
      },
      {
        source: '/auth',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' }
        ],
      },
      {
        source: '/sign-up',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' }
        ],
      }
    ];
  },

  async redirects() {
    return [
      { source: '/login', destination: '/auth', permanent: true },
    ];
  },
};

export default nextConfig;