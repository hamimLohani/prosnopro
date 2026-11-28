"use client";

import { CheckCircle2, Globe, Lock, Pencil, Trash2 } from "lucide-react";
import { useLang } from "@/components/language-provider";
import { MathText } from "@/components/math-text";
import { pickText } from "@/lib/i18n";
import type { QuestionBankItem } from "@/lib/types";

interface QuestionBankCardProps {
  item: QuestionBankItem;
  isOwner: boolean;
  selected: boolean;
  busy: boolean;
  onSelectChange: (checked: boolean) => void;
  onToggleVisibility: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
}

export function QuestionBankCard({
  item,
  isOwner,
  selected,
  busy,
  onSelectChange,
  onToggleVisibility,
  onEdit,
  onRequestDelete,
}: QuestionBankCardProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-2.5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {isOwner && (
              <label className="inline-flex min-h-[38px] sm:min-h-[28px] min-w-[34px] sm:min-w-0 items-center justify-center -ml-1.5 sm:ml-0 cursor-pointer">
                <input
                  type="checkbox"
                  aria-label={t("প্রশ্ন নির্বাচন করুন", "Select question")}
                  checked={selected}
                  onChange={(e) => onSelectChange(e.target.checked)}
                  className="h-5 w-5 sm:h-4 sm:w-4 rounded border-slate-300 text-navy cursor-pointer"
                />
              </label>
            )}
            <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
              {item.medium === "bn" ? t("বাংলা", "Bangla") : "English"}
            </span>
            {item.subject && (
              <span className="rounded bg-navy/10 px-2 py-0.5 font-medium text-navy">
                {item.subject}
              </span>
            )}
            {item.class && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                {item.class}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold ${
                item.visibility === "shared"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {item.visibility === "shared" ? (
                <Globe className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {item.visibility === "shared" ? t("শেয়ার্ড", "Shared") : t("প্রাইভেট", "Private")}
            </span>
          </div>

          {isOwner && (
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onToggleVisibility}
                title={t("Private / Shared পরিবর্তন করুন", "Toggle Private / Shared")}
                className="min-h-[38px] sm:min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-medium text-navy hover:bg-slate-100 cursor-pointer"
              >
                {item.visibility === "shared"
                  ? t("Private করুন", "Make Private")
                  : t("Share করুন", "Share")}
              </button>
              <button
                type="button"
                onClick={onEdit}
                title={t("Edit করুন", "Edit")}
                aria-label={t("Edit করুন", "Edit")}
                className="inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onRequestDelete}
                title={t("মুছুন", "Delete")}
                aria-label={t("মুছুন", "Delete")}
                className="inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <p className="text-[15px] sm:text-sm font-semibold leading-relaxed text-slate-900 break-words">
          <MathText text={item.text} />
        </p>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2 text-[13px] sm:text-xs">
        {item.options.map((opt, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 ${
              idx === item.correct_index
                ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-900"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {idx === item.correct_index && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            )}
            <span className="min-w-0 break-words">
              <MathText text={opt} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
