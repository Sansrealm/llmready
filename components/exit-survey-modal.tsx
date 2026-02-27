"use client";

import { useEffect, useState, useRef } from "react";
import { X, MessageSquare } from "lucide-react";

const REASONS = [
  { value: "price",    label: "Price is too high" },
  { value: "value",    label: "Don't see the value" },
  { value: "features", label: "Want to see more features first" },
  { value: "team",     label: "Need to talk to my team" },
  { value: "other",    label: "Other" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

/**
 * Storage keys
 *
 * STORAGE_SUBMITTED  — localStorage. Set once on submit. Prevents ever showing again.
 * STORAGE_MINIMIZED  — localStorage. Set when a signed-in user dismisses the popup
 *                      without submitting. Causes the floating icon to reappear on
 *                      every subsequent visit until they submit.
 * STORAGE_SESSION    — sessionStorage. Guests only: prevents re-triggering in the
 *                      same browser session after exit-intent fires once.
 * STORAGE_SESSION_ID — localStorage UUID for anonymous session tracking.
 */
const STORAGE_SUBMITTED  = "llmcheck_exit_survey_submitted";
const STORAGE_MINIMIZED  = "llmcheck_exit_survey_minimized";
const STORAGE_SESSION    = "llmcheck_exit_survey_shown";
const STORAGE_SESSION_ID = "llmcheck_session_id";

type View = "hidden" | "modal" | "minimized" | "submitted";

function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(STORAGE_SESSION_ID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_SESSION_ID, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

interface ExitSurveyModalProps {
  isPremium: boolean;
  isSignedIn: boolean;
  page?: string;
}

export default function ExitSurveyModal({
  isPremium,
  isSignedIn,
  page = "results",
}: ExitSurveyModalProps) {
  const [view, setView]           = useState<View>("hidden");
  const [selected, setSelected]   = useState<Reason | null>(null);
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const entryTime = useRef(Date.now());

  useEffect(() => {
    // Never show to premium users
    if (isPremium) return;

    try {
      // Permanently suppressed after submission
      if (localStorage.getItem(STORAGE_SUBMITTED)) return;

      if (isSignedIn) {
        // Signed-in: if they previously dismissed without submitting,
        // restore the floating icon immediately (no exit-intent needed).
        if (localStorage.getItem(STORAGE_MINIMIZED)) {
          setView("minimized");
          return;
        }
        // First time ever — wait for exit intent (handled below).
      } else {
        // Guest: only show once per browser session.
        if (sessionStorage.getItem(STORAGE_SESSION)) return;
      }
    } catch {
      return;
    }

    const MIN_TIME_ON_PAGE = 5000; // 5 seconds

    const trigger = () => {
      if (Date.now() - entryTime.current < MIN_TIME_ON_PAGE) return;
      try {
        if (localStorage.getItem(STORAGE_SUBMITTED)) return;
        if (isSignedIn) {
          if (localStorage.getItem(STORAGE_MINIMIZED)) return;
          // Mark as "seen" so subsequent visits show the floating icon
          localStorage.setItem(STORAGE_MINIMIZED, "true");
        } else {
          if (sessionStorage.getItem(STORAGE_SESSION)) return;
          sessionStorage.setItem(STORAGE_SESSION, "true");
        }
      } catch { /* ignore */ }
      setView("modal");
    };

    // Desktop: mouse leaving toward browser chrome
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) trigger();
    };

    // Mobile / tab switch: page becomes hidden
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") trigger();
    };

    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isPremium, isSignedIn]);

  const handleClose = () => {
    if (isSignedIn) {
      // Signed-in users: collapse to floating icon (already marked in localStorage)
      setView("minimized");
    } else {
      // Guests: just hide for this session (sessionStorage already set)
      setView("hidden");
    }
  };

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);

    try {
      await fetch("/api/exit-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: selected,
          otherText: selected === "other" ? otherText : undefined,
          sessionId: getOrCreateSessionId(),
          page,
        }),
      });
    } catch { /* fail silently — don't block the UX */ }

    try {
      localStorage.removeItem(STORAGE_MINIMIZED);
      localStorage.setItem(STORAGE_SUBMITTED, "true");
    } catch { /* ignore */ }

    setSubmitting(false);
    setView("submitted");

    // Auto-close after 2.5 seconds
    setTimeout(() => setView("hidden"), 2500);
  };

  if (view === "hidden") return null;

  // ── Minimized floating icon ──────────────────────────────────────────────
  if (view === "minimized") {
    return (
      <button
        onClick={() => setView("modal")}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium pl-3 pr-4 py-2.5 rounded-full shadow-lg transition-colors"
        aria-label="Open feedback survey"
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span>Quick feedback</span>
      </button>
    );
  }

  // ── Full modal (modal + submitted states) ────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Before you go
            </p>
            <h2 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
              What would make you upgrade to see your AI visibility?
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="ml-3 mt-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === "submitted" ? (
          /* Thank you state */
          <div className="px-5 pb-6 pt-2 text-center">
            <p className="text-2xl mb-2">🙏</p>
            <p className="font-semibold text-gray-900 dark:text-white">Thanks for your input!</p>
            <p className="text-sm text-gray-500 mt-1">Your feedback helps us improve.</p>
          </div>
        ) : (
          /* Survey state */
          <div className="px-5 pb-5 space-y-2">
            {REASONS.map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected === value
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="exit-reason"
                  value={value}
                  checked={selected === value}
                  onChange={() => setSelected(value)}
                  className="accent-indigo-600"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">{label}</span>
              </label>
            ))}

            {selected === "other" && (
              <input
                type="text"
                placeholder="Tell us more..."
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoFocus
              />
            )}

            <button
              onClick={handleSubmit}
              disabled={!selected || submitting}
              className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {submitting ? "Sending..." : "Submit"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
