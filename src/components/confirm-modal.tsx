"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  busy = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { lang } = useLang();
  const resolvedConfirmLabel = confirmLabel ?? pickText(lang, "নিশ্চিত করুন", "Confirm");
  const resolvedCancelLabel = cancelLabel ?? pickText(lang, "বাতিল", "Cancel");

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const onCancelRef = useRef(onCancel);
  const busyRef = useRef(busy);

  useEffect(() => {
    onCancelRef.current = onCancel;
    busyRef.current = busy;
  }, [onCancel, busy]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      cancelBtnRef.current?.focus();

      function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape" && !busyRef.current) {
          e.preventDefault();
          onCancelRef.current();
          return;
        }
        if (e.key === "Tab" && dialogRef.current) {
          const focusables = Array.from(
            dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
          ).filter((el) => el.offsetParent !== null);
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }

      window.addEventListener("keydown", onKeyDown);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      prevFocusRef.current?.focus?.();
    }
  }, [open]);

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
          if (!busyRef.current) onCancelRef.current();
        }}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative z-10 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 shadow-xl space-y-4"
      >
        <div className="flex items-start gap-3">
          <div
            className={`rounded-xl p-2.5 shrink-0 ${
              tone === "danger" ? "bg-rose-100 text-rose-600" : "bg-navy/10 text-navy"
            }`}
          >
            {tone === "danger" ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1">
            <h2 id="confirm-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">{message}</p>
          </div>
        </div>

        {children}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-[44px] w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            {resolvedCancelLabel}
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
            <span>{resolvedConfirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
