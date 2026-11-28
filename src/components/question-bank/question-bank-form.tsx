"use client";

import { Loader2 } from "lucide-react";
import { ClassSelect } from "@/components/class-select";
import { useLang } from "@/components/language-provider";
import { SearchableSubjectSelect } from "@/components/searchable-subject-select";
import { pickText } from "@/lib/i18n";
import { optionLabel } from "@/lib/mcq";
import type { ExamMedium } from "@/lib/types";

interface QuestionBankFormProps {
  editingId: string | null;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  subject: string;
  classLevel: string;
  tagsInput: string;
  medium: ExamMedium;
  visibility: "private" | "shared";
  busy: boolean;
  embedded?: boolean;
  onTextChange: (v: string) => void;
  onOptionsChange: (opts: string[]) => void;
  onCorrectIndexChange: (idx: number) => void;
  onExplanationChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onClassChange: (v: string) => void;
  onTagsChange: (v: string) => void;
  onMediumChange: (v: ExamMedium) => void;
  onVisibilityChange: (v: "private" | "shared") => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function QuestionBankForm({
  editingId,
  text,
  options,
  correctIndex,
  explanation,
  subject,
  classLevel,
  tagsInput,
  medium,
  visibility,
  busy,
  embedded = false,
  onTextChange,
  onOptionsChange,
  onCorrectIndexChange,
  onExplanationChange,
  onSubjectChange,
  onClassChange,
  onTagsChange,
  onMediumChange,
  onVisibilityChange,
  onCancel,
  onSubmit,
}: QuestionBankFormProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  return (
    <form
      onSubmit={onSubmit}
      className={
        embedded
          ? "space-y-4"
          : "rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4"
      }
    >
      <h2 className="text-base font-bold text-navy">
        {editingId
          ? t("Bank-এর প্রশ্ন Edit করুন", "Edit Question Bank Item")
          : t("Question Bank-এ নতুন প্রশ্ন", "New Question Bank Item")}
      </h2>

      <textarea
        rows={2}
        required
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={t(
          "প্রশ্নের লেখা (বাংলা বা English, $...$ দিয়ে গণিতের সূত্র লেখা যাবে)",
          "Question text (Bangla or English; use $...$ for math formulas)",
        )}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm"
      />

      <div className="space-y-2">
        <span className="block text-xs font-semibold text-slate-600">
          {t("৪টি Option (সঠিক উত্তর সিলেক্ট করুন)", "4 Options (select the correct answer)")}
        </span>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {options.map((opt, idx) => (
            <div
              key={idx}
              className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-2.5 py-2 ${
                correctIndex === idx ? "border-emerald-400 bg-emerald-50/60" : "border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="bank-correct"
                aria-label={t(`Option ${idx + 1} সঠিক`, `Option ${idx + 1} correct`)}
                checked={correctIndex === idx}
                onChange={() => onCorrectIndexChange(idx)}
                className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-emerald-600 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-500 shrink-0">
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
                placeholder={t(`অপশন ${idx + 1}`, `Option ${idx + 1}`)}
                className="w-full bg-transparent text-base sm:text-sm focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <SearchableSubjectSelect
          value={subject}
          onChange={onSubjectChange}
          placeholder={t("Subject (বিষয়)", "Subject")}
        />
        <ClassSelect
          value={classLevel}
          onChange={onClassChange}
          placeholder="Class / Level"
        />
        <select
          value={medium}
          onChange={(e) => onMediumChange(e.target.value as ExamMedium)}
          className="h-11 sm:h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm"
        >
          <option value="bn">{t("বাংলা", "Bangla")}</option>
          <option value="en">English</option>
        </select>
        <select
          value={visibility}
          onChange={(e) => onVisibilityChange(e.target.value as "private" | "shared")}
          className="h-11 sm:h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm"
        >
          <option value="private">{t("Private (শুধু আমি)", "Private (Only me)")}</option>
          <option value="shared">{t("Shared (সবার জন্য)", "Shared (Everyone)")}</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder={t(
            "Tag (কমা দিয়ে, যেমন: mechanics, chapter-4)",
            "Tags (comma separated, e.g. mechanics, chapter-4)",
          )}
          className="h-11 sm:h-[42px] rounded-lg border border-slate-300 px-3 text-base sm:text-sm"
        />
        <input
          type="text"
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          placeholder={t("ব্যাখ্যা / Explanation (ঐচ্ছিক)", "Explanation (optional)")}
          className="h-11 sm:h-[42px] rounded-lg border border-slate-300 px-3 text-base sm:text-sm"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 cursor-pointer"
        >
          {t("বাতিল", "Cancel")}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong cursor-pointer"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>
            {editingId ? t("Update করুন", "Update Question") : t("প্রশ্ন Save করুন", "Save Question")}
          </span>
        </button>
      </div>
    </form>
  );
}
