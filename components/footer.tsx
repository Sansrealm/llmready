import Link from "next/link"

export default function Footer() {
  return (
    <footer className="w-full border-t bg-white py-6 dark:bg-gray-950">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-3 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-green-500 text-white">
                <span className="font-bold">LC</span>
              </div>
              <span className="text-lg font-bold">LLM Check</span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Optimize your website for AI-powered search and improve your visibility.
            </p>
          </div>
          <div className="md:col-span-3 md:col-start-5">
            <h3 className="mb-4 text-sm font-semibold">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/pricing"
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div className="md:col-span-3 md:col-start-8">
            <h3 className="mb-4 text-sm font-semibold">Documents</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/guide"
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  LLM Optimization Guide
                </Link>
              </li>
            </ul>
          </div>
          <div className="md:col-span-3 md:col-start-11">
            <h3 className="mb-4 text-sm font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} LLM Check Analyzer. All rights reserved.
          </p>
          <div className="flex gap-4">
          </div>
        </div>
      </div>
    </footer>
  )
}
