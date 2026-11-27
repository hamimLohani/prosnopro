"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Mobile-friendly confirmation dialog rendered via portal to avoid native window.confirm popups.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        onCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!busy) onCancel();
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-xl p-2.5 shrink-0 ${
              tone === "danger" ? "bg-rose-100 text-rose-600" : "bg-navy/10 text-navy"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 id="confirm-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">{message}</p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-[44px] w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer ${
              tone === "danger"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-navy hover:bg-navy-strong"
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
