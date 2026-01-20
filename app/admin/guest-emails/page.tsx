import { getGuestEmailsForOutreach } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Admin Dashboard: Guest Email List
 *
 * Displays all captured guest emails for outreach campaigns.
 * Protected by Clerk authentication (TODO: Add admin role check).
 *
 * Features:
 * - View all guest emails sorted by most recent
 * - See capture timestamps and analysis counts
 * - Copy all emails to clipboard for mail merge
 * - Excludes opted-out users automatically
 */
export default async function GuestEmailsPage() {
  // Authentication check
  const { userId } = await auth();

  // TODO: Add admin role check from Clerk metadata
  // For now, any authenticated user can access
  // Future: Check if user.publicMetadata.isAdmin === true
  if (!userId) {
    redirect('/');
  }

  // Fetch guest emails (excludes opted-out automatically)
  const emails = await getGuestEmailsForOutreach(1000, 0); // Get first 1000

  // Calculate stats
  const totalEmails = emails.length;
  const totalAnalyses = emails.reduce((sum, email) => sum + email.analysis_count, 0);
  const avgAnalysesPerUser = totalEmails > 0 ? (totalAnalyses / totalEmails).toFixed(1) : 0;
  const powerUsers = emails.filter(e => e.analysis_count >= 3).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Guest Email List</h1>
          <p className="text-muted-foreground">
            Captured emails from unauthenticated users for outreach campaigns
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-6 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalEmails}</div>
            <div className="text-sm text-muted-foreground">Total Emails</div>
          </div>
          <div className="p-6 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalAnalyses}</div>
            <div className="text-sm text-muted-foreground">Total Analyses</div>
          </div>
          <div className="p-6 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{avgAnalysesPerUser}</div>
            <div className="text-sm text-muted-foreground">Avg Analyses/User</div>
          </div>
          <div className="p-6 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{powerUsers}</div>
            <div className="text-sm text-muted-foreground">Power Users (3+)</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-4">
          <Button
            onClick={async () => {
              'use client';
              const emailList = emails.map(e => e.email).join(', ');
              await navigator.clipboard.writeText(emailList);
              alert('Email list copied to clipboard!');
            }}
          >
            Copy All Emails (Comma-Separated)
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              'use client';
              const emailList = emails.map(e => e.email).join('\n');
              await navigator.clipboard.writeText(emailList);
              alert('Email list copied to clipboard (one per line)!');
            }}
          >
            Copy All Emails (Line-Separated)
          </Button>
        </div>

        {/* Email Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left font-semibold">#</th>
                  <th className="p-3 text-left font-semibold">Email</th>
                  <th className="p-3 text-left font-semibold">First Seen</th>
                  <th className="p-3 text-left font-semibold">Last Analysis</th>
                  <th className="p-3 text-center font-semibold">Analysis Count</th>
                  <th className="p-3 text-center font-semibold">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {emails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No guest emails captured yet. Emails will appear here when guests provide their email during analysis.
                    </td>
                  </tr>
                ) : (
                  emails.map((email, index) => {
                    const daysSinceFirst = Math.floor(
                      (new Date().getTime() - new Date(email.first_captured_at).getTime()) /
                      (1000 * 60 * 60 * 24)
                    );
                    const daysSinceLast = Math.floor(
                      (new Date().getTime() - new Date(email.last_analysis_at).getTime()) /
                      (1000 * 60 * 60 * 24)
                    );

                    let engagementLabel = '';
                    let engagementColor = '';
                    if (email.analysis_count >= 5) {
                      engagementLabel = 'Very High';
                      engagementColor = 'text-green-600 font-bold';
                    } else if (email.analysis_count >= 3) {
                      engagementLabel = 'High';
                      engagementColor = 'text-blue-600 font-semibold';
                    } else if (email.analysis_count >= 2) {
                      engagementLabel = 'Medium';
                      engagementColor = 'text-yellow-600';
                    } else {
                      engagementLabel = 'Low';
                      engagementColor = 'text-gray-600';
                    }

                    return (
                      <tr key={email.email} className="border-t hover:bg-muted/50">
                        <td className="p-3 text-muted-foreground">{index + 1}</td>
                        <td className="p-3 font-mono text-sm">{email.email}</td>
                        <td className="p-3 text-sm">
                          {new Date(email.first_captured_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                          <div className="text-xs text-muted-foreground">
                            {daysSinceFirst === 0 ? 'Today' : `${daysSinceFirst}d ago`}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          {new Date(email.last_analysis_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                          <div className="text-xs text-muted-foreground">
                            {daysSinceLast === 0 ? 'Today' : `${daysSinceLast}d ago`}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold">
                            {email.analysis_count}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-sm ${engagementColor}`}>
                            {engagementLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold mb-2">Notes:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Emails are automatically deduplicated (one record per unique email)</li>
            <li>• Opted-out users are excluded from this list automatically</li>
            <li>• Analysis count increments each time the same email analyzes a site</li>
            <li>• Power users (3+ analyses) show high engagement and are priority leads</li>
            <li>• Use unsubscribe links in campaigns: /api/unsubscribe?email=user@example.com</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
