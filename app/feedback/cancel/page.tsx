"use client";

import ExitSurveyModal from "@/components/exit-survey-modal";

export default function CancelFeedbackPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Before you go — help us improve
        </h1>
        <p className="text-gray-500 text-base">
          Your feedback goes directly to the founder and shapes what we build next.
        </p>
      </div>
      {/* forceOpen bypasses exit-intent — modal renders open immediately */}
      <ExitSurveyModal isPremium={false} isSignedIn={false} forceOpen={true} page="cancel" />
    </div>
  );
}
