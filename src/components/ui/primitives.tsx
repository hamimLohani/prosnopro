import type { ReactNode } from "react";
import type { AppLang } from "@/lib/i18n";
import { formatAttemptStatus, formatExamStatus } from "@/lib/mcq";
import type { AttemptStatus, ExamStatus } from "@/lib/types";

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
}

export function SurfaceCard({ children, className = "" }: SurfaceCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

interface ExamStatusBadgeProps {
  status: ExamStatus;
  lang: AppLang;
}

export function ExamStatusBadge({ status, lang }: ExamStatusBadgeProps) {
  const styleClass =
    status === "published"
      ? "bg-emerald-100 text-emerald-800"
      : status === "closed"
        ? "bg-slate-200 text-slate-700"
        : "bg-amber-100 text-amber-900";

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styleClass}`}>
      {formatExamStatus(status, lang)}
    </span>
  );
}

interface AttemptStatusBadgeProps {
  status: AttemptStatus;
  lang: AppLang;
}

export function AttemptStatusBadge({ status, lang }: AttemptStatusBadgeProps) {
  const styleClass =
    status === "in_progress"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styleClass}`}>
      {formatAttemptStatus(status, lang)}
    </span>
  );
}

interface InlineAlertProps {
  tone?: "error" | "success" | "warning";
  children: ReactNode;
  className?: string;
}

export function InlineAlert({ tone = "error", children, className = "" }: InlineAlertProps) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${toneClass} ${className}`}
    >
      {children}
    </div>
  );
}
