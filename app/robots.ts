import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://llmcheck.app';
  const isProduction = baseUrl.includes('llmcheck.app');

  if (!isProduction) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/', '/sign-up/', '/login/', '/profile/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
