import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
}

export function Toast({ message, duration = 2000, onClose, type = 'success' }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 transform transition-all duration-300 ease-in-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        {type === 'success' && (
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {message}
        </p>
      </div>
    </div>
  );
} 