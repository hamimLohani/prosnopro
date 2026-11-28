"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";

interface StatusToastProps {
  message: string | null;
  tone?: "success" | "error";
  onDismiss: () => void;
}

export function StatusToast({ message, tone = "success", onDismiss }: StatusToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`no-print fixed bottom-20 sm:bottom-6 right-3 left-3 sm:left-auto sm:max-w-sm z-40 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs sm:text-sm font-medium shadow-lg ${
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
    >
      {tone === "error" ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
      )}
      <span className="flex-1 break-words">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="বন্ধ করুন"
        className="rounded-lg p-1 hover:bg-black/5 cursor-pointer shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
