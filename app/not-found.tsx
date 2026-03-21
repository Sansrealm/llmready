// Force dynamic to prevent static prerendering — ClerkProvider in the root
// layout requires NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY at build time, which is
// only available in Production Vercel environments, not Preview deployments.
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-6">This page could not be found.</p>
        <a href="/" className="text-primary underline underline-offset-4">
          Go home
        </a>
      </div>
    </div>
  );
}
