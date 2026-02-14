/**
 * Lightweight Google Analytics event tracking utility.
 * Uses the existing GTM gtag instance (G-8VL38BB1K6).
 * Window.gtag type is declared in components/Analytics.tsx.
 */

export function trackEvent(action: string, params?: Record<string, string>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params);
  }
}
