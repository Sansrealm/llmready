import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { AlertCircle } from 'lucide-react';

export default function ShareNotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
              <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4">Share Link Not Found</h1>

          <p className="text-lg text-muted-foreground mb-8">
            This share link may have expired or doesn't exist. Share links are valid for 30 days from creation.
          </p>

          <div className="space-y-4">
            <Link href="/" className="block">
              <Button size="lg" className="w-full">
                Analyze Your Website
              </Button>
            </Link>

            <Link href="/pricing" className="block">
              <Button variant="outline" size="lg" className="w-full">
                View Pricing
              </Button>
            </Link>
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 Want to create your own shareable analysis reports?
              <Link href="/pricing" className="font-medium hover:underline ml-1">
                Upgrade to Premium
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
