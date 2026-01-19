"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EmailReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string;
  url: string;
  overallScore: number;
  defaultEmail?: string | null;
}

export function EmailReportDialog({
  open,
  onOpenChange,
  analysisId,
  url,
  overallScore,
  defaultEmail,
}: EmailReportDialogProps) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);

  // Validate email on change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (value && !emailRegex.test(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const handleSend = async () => {
    if (!email || !isEmailValid) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/share/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          recipientEmail: email,
          recipientName: name || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send email");
      }

      const data = await response.json();
      toast.success("Report sent successfully!");
      onOpenChange(false);

      // Reset form
      setEmail(defaultEmail || "");
      setName("");
      setEmailError("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send report");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Analysis Report</DialogTitle>
          <DialogDescription>
            Send the analysis report for {url} to an email address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Score Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{overallScore}/100</div>
            <div className="text-sm text-muted-foreground">Overall Score</div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={handleEmailChange}
              disabled={sending}
            />
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name">Recipient Name (optional)</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={sending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !isEmailValid || !email}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
