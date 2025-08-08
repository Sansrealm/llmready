/** @type {import('next').NextConfig} */

// CSP configuration for Clerk security - UPDATED VERSION with better analytics support
const CLERK_FRONTEND_API = 'https://clerk.llmcheck.app';
const MAIN_API_DOMAIN = 'https://www.llmcheck.app';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval'"
  } ${CLERK_FRONTEND_API} 
     https://challenges.cloudflare.com 
     https://www.googletagmanager.com 
     https://www.google-analytics.com
     https://analytics.google.com
     https://*.clerk.com 
     https://*.clerk.dev;
  connect-src 'self' 
     ${CLERK_FRONTEND_API} 
     ${MAIN_API_DOMAIN} 
     https://*.clerk.com 
     https://*.clerk.dev 
     https://www.google-analytics.com 
     https://analytics.google.com
     https://stats.g.doubleclick.net
     https://api.clerk.com;
  img-src 'self' 
     https://img.clerk.com 
     https://*.clerk.com 
     https://www.googletagmanager.com 
     https://www.google-analytics.com 
     https://analytics.google.com
     data: blob:;
  worker-src 'self' blob:;
  style-src 'self' 'unsafe-inline';
  frame-src 'self' 
     https://challenges.cloudflare.com 
     https://*.clerk.com 
     https://*.clerk.dev;
  form-action 'self';
  font-src 'self' data:;
  media-src 'self';
  object-src 'none';
  base-uri 'self';
`;

const nextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          }
        ],
      },
      {
        // Special headers for auth pages to ensure proper OTP flow
        source: '/auth',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ],
      },
      {
        // Special headers for sign-up page
        source: '/sign-up',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ],
      }
    ];
  },

  async redirects() {
    return [
      // Redirect old login routes to new auth page
      {
        source: '/login',
        destination: '/auth',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;