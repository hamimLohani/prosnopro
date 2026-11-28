"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";

interface ExamTakeoverModalProps {
  open: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ExamTakeoverModal({ open }: ExamTakeoverModalProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    linkRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
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
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="takeover-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl space-y-4 text-center"
      >
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-600" />
        <h2 id="takeover-modal-title" className="text-xl font-bold text-slate-900">
          {t("অন্য জায়গায় Session চালু হয়েছে", "Session Active Elsewhere")}
        </h2>
        <p className="text-sm text-slate-600">
          {t(
            "এই Exam-টি অন্য একটি Browser tab বা ডিভাইসে খোলা হয়েছে, তাই এই উইন্ডোটি লক করা হয়েছে।",
            "This exam was opened in another browser tab or device, so this window has been locked.",
          )}
        </p>
        <Link
          ref={linkRef}
          href="/student"
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("Student Dashboard-এ ফিরে যান", "Back to Student Dashboard")}
        </Link>
      </div>
    </div>
  );
}

interface ExamSubmitModalProps {
  open: boolean;
  submitting: boolean;
  answeredCount: number;
  totalQuestions: number;
  flaggedCount: number;
  isOffline: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExamSubmitModal({
  open,
  submitting,
  answeredCount,
  totalQuestions,
  flaggedCount,
  isOffline,
  onConfirm,
  onCancel,
}: ExamSubmitModalProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  return (
    <ConfirmModal
      open={open}
      tone="primary"
      title={t("Exam Submit করবেন?", "Submit Exam?")}
      message={t(
        "একবার Submit করলে আর উত্তর পরিবর্তন করা যাবে না।",
        "Once submitted, you can no longer change your answers.",
      )}
      confirmLabel={t("Submit নিশ্চিত করুন", "Confirm Submit")}
      cancelLabel={t("উত্তরগুলো দেখুন", "Review Answers")}
      busy={submitting}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-1">
        <p>
          {t("উত্তর দিয়েছেন:", "Answered:")}{" "}
          <span className="font-bold text-emerald-700">
            {answeredCount} / {totalQuestions}
          </span>
        </p>
        <p>
          {t("উত্তর বাকি:", "Remaining:")}{" "}
          <span className="font-bold text-slate-800">{totalQuestions - answeredCount}</span>
        </p>
        {flaggedCount > 0 && (
          <p>
            {t("পুনরায় দেখার জন্য চিহ্নিত:", "Flagged for review:")}{" "}
            <span className="font-bold text-amber-800">
              {t(`${flaggedCount}টি`, `${flaggedCount}`)}
            </span>
          </p>
        )}
        {isOffline && (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
            {t(
              "আপনার ইন্টারনেট সংযোগ বিচ্ছিন্ন রয়েছে। Submit করার আগে সংযোগ ফিরে আসা পর্যন্ত অপেক্ষা করুন — আপনার সব উত্তর ফোনে নিরাপদে সংরক্ষিত আছে।",
              "You appear to be offline. Wait until your connection returns before confirming submission — all your answers are safely saved locally.",
            )}
          </p>
        )}
      </div>
    </ConfirmModal>
  );
}
