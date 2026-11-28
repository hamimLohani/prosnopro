"use client";

import { Loader2, Plus } from "lucide-react";
import { useLang } from "@/components/language-provider";
import { MathText } from "@/components/math-text";
import { pickText } from "@/lib/i18n";
import { optionLabel } from "@/lib/mcq";
import type { ExamMedium } from "@/lib/types";

interface ManualQuestionFormProps {
  medium: ExamMedium;
  optionCount: number;
  editingId: string | null;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  marks: string;
  saveToBank: boolean;
  busy: boolean;
  onTextChange: (value: string) => void;
  onOptionsChange: (options: string[]) => void;
  onCorrectIndexChange: (index: number) => void;
  onExplanationChange: (value: string) => void;
  onMarksChange: (value: string) => void;
  onSaveToBankChange: (checked: boolean) => void;
  onCancelEdit: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ManualQuestionForm({
  medium,
  optionCount,
  editingId,
  text,
  options,
  correctIndex,
  explanation,
  marks,
  saveToBank,
  busy,
  onTextChange,
  onOptionsChange,
  onCorrectIndexChange,
  onExplanationChange,
  onMarksChange,
  onSaveToBankChange,
  onCancelEdit,
  onSubmit,
}: ManualQuestionFormProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-navy">
          {editingId
            ? t("প্রশ্ন Edit করুন", "Edit Question")
            : t("Manual প্রশ্ন যোগ করুন", "Add Manual Question")}
        </h2>
        {editingId && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="min-h-[38px] px-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {t("Edit বাতিল", "Cancel Edit")}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="q-text" className="block text-sm font-medium text-slate-700">
          {t("প্রশ্নের লেখা", "Question Text")}{" "}
          <span className="text-xs font-normal text-slate-400">
            {t("($x^2 + y^2$ দিয়ে গণিতের সূত্র লেখা যাবে)", "(use $x^2 + y^2$ for math formulas)")}
          </span>
        </label>
        <textarea
          id="q-text"
          rows={3}
          required
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={
            medium === "bn"
              ? t("এখানে বাংলা বা ইংরেজিতে প্রশ্ন লিখুন...", "Enter question in Bangla or English...")
              : t("এখানে প্রশ্ন লিখুন...", "Enter question here...")
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
        />
        {text.includes("$") && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-2">
              {t("প্রিভিউ:", "Preview:")}
            </span>
            <MathText text={text} />
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <span className="block text-sm font-medium text-slate-700">
          {t("Options (সঠিক উত্তরটি সিলেক্ট করুন)", "Options (select the correct answer)")}
        </span>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {options.map((opt, idx) => (
            <div
              key={idx}
              className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-2.5 py-2 ${
                correctIndex === idx
                  ? "border-emerald-400 bg-emerald-50/50"
                  : "border-slate-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="correct-option"
                aria-label={t(
                  `Option ${optionLabel(idx, medium)} সঠিক`,
                  `Option ${idx + 1} correct`,
                )}
                checked={correctIndex === idx}
                onChange={() => onCorrectIndexChange(idx)}
                className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-emerald-600 cursor-pointer"
              />
              <span className="font-semibold text-xs text-slate-600 w-5 text-center shrink-0">
                {optionLabel(idx, medium)}
              </span>
              <input
                type="text"
                required
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[idx] = e.target.value;
                  onOptionsChange(next);
                }}
                placeholder={t(`Option ${optionLabel(idx, medium)}`, `Option ${idx + 1}`)}
                className="w-full bg-transparent text-base sm:text-sm text-slate-900 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="q-expl" className="block text-sm font-medium text-slate-700">
            {t("ব্যাখ্যা / Explanation", "Explanation")}{" "}
            <span className="text-xs font-normal text-slate-400">({t("ঐচ্ছিক", "optional")})</span>
          </label>
          <input
            id="q-expl"
            type="text"
            value={explanation}
            onChange={(e) => onExplanationChange(e.target.value)}
            placeholder={t(
              "Result প্রকাশের পর সঠিক উত্তরের নিচে দেখা যাবে",
              "Shown below the correct answer after results are released",
            )}
            className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="q-marks" className="block text-sm font-medium text-slate-700">
            {t("নম্বর (Marks)", "Marks")}
          </label>
          <input
            id="q-marks"
            type="number"
            step="0.25"
            min="0.25"
            value={marks}
            onChange={(e) => onMarksChange(e.target.value)}
            className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>
      </div>

      {!editingId && (
        <label className="flex min-h-[40px] items-center gap-2.5 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={saveToBank}
            onChange={(e) => onSaveToBankChange(e.target.checked)}
            className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
          />
          <span>
            {t("আমার Question Bank-এও একটি কপি Save করুন", "Also save a copy to my Question Bank")}
          </span>
        </label>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span>
            {editingId
              ? t("প্রশ্ন Update করুন", "Update Question")
              : t(
                  `প্রশ্ন যোগ করুন (${optionCount} options)`,
                  `Add Question (${optionCount} options)`,
                )}
          </span>
        </button>
      </div>
    </form>
  );
}
