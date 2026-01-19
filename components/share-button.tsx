"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Link2, Mail, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmailReportDialog } from "./email-report-dialog";

interface ShareButtonProps {
  analysisId: string;
  isPremium: boolean;
  userEmail?: string | null;
  url: string;
  overallScore: number;
}

export function ShareButton({
  analysisId,
  isPremium,
  userEmail,
  url,
  overallScore,
}: ShareButtonProps) {
  const [hasShareLink, setHasShareLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const handleCopyLink = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create share link");
      }

      const data = await response.json();

      // Copy to clipboard
      const shareUrl = `${window.location.origin}/shared/${data.shareId}`;
      await navigator.clipboard.writeText(shareUrl);

      toast.success("Share link copied to clipboard!");
      setHasShareLink(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create share link"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/share/revoke", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to revoke share access");
      }

      toast.success("Share access revoked");
      setHasShareLink(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke share access"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailReport = () => {
    if (!isPremium) {
      toast.error("Email reports are only available for Premium users");
      return;
    }
    setEmailDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="mr-2 h-4 w-4" />
            )}
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleCopyLink} disabled={loading}>
            <Link2 className="mr-2 h-4 w-4" />
            Copy Share Link
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleEmailReport}
            disabled={!isPremium || loading}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email Report
            {!isPremium && (
              <span className="ml-auto text-xs text-muted-foreground">
                (Premium)
              </span>
            )}
          </DropdownMenuItem>
          {hasShareLink && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleRevoke}
                disabled={loading}
                className="text-red-600 focus:text-red-600"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Revoke Access
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EmailReportDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        analysisId={analysisId}
        url={url}
        overallScore={overallScore}
        defaultEmail={userEmail}
      />
    </>
  );
}
