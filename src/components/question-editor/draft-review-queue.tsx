"use client";

import { CheckCircle2, Loader2, Pencil } from "lucide-react";
import { useLang } from "@/components/language-provider";
import { MathText } from "@/components/math-text";
import type { DraftMcqQuestion } from "@/lib/ai/schema";
import { pickText } from "@/lib/i18n";
import { optionLabel } from "@/lib/mcq";
import type { ExamMedium } from "@/lib/types";

interface DraftReviewQueueProps {
  drafts: DraftMcqQuestion[];
  medium: ExamMedium;
  editingDraftIdx: number | null;
  saveDraftsToBank?: boolean;
  showSaveToBankToggle?: boolean;
  confirmLabel?: string;
  savingDrafts: boolean;
  onSetDrafts: React.Dispatch<React.SetStateAction<DraftMcqQuestion[]>>;
  onSetEditingDraftIdx: React.Dispatch<React.SetStateAction<number | null>>;
  onSaveDraftsToBankChange?: (checked: boolean) => void;
  onSaveAllDrafts: () => void;
  onDiscardAll: () => void;
}

export function DraftReviewQueue({
  drafts,
  medium,
  editingDraftIdx,
  saveDraftsToBank = true,
  showSaveToBankToggle = true,
  confirmLabel,
  savingDrafts,
  onSetDrafts,
  onSetEditingDraftIdx,
  onSaveDraftsToBankChange,
  onSaveAllDrafts,
  onDiscardAll,
}: DraftReviewQueueProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  if (drafts.length === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">
            {t(
              `Draft প্রশ্ন যাচাই করুন (${drafts.length}টি)`,
              `Review Draft Questions (${drafts.length})`,
            )}
          </h2>
          <p className="text-xs text-slate-600">
            {t(
              "Save করার আগে প্রতিটি প্রশ্ন ও সঠিক উত্তর যাচাই করে নিন।",
              "Verify each question and its correct answer before saving.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onDiscardAll}
          className="min-h-[38px] px-2 text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
        >
          {t("সব Draft বাতিল করুন", "Discard All Drafts")}
        </button>
      </div>

      <div className="space-y-4">
        {drafts.map((draft, dIdx) => {
          const isEditingDraft = editingDraftIdx === dIdx;
          return (
            <div
              key={dIdx}
              className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-700">
                  {t(`খসড়া #${dIdx + 1}`, `Draft #${dIdx + 1}`)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSetEditingDraftIdx(isEditingDraft ? null : dIdx)}
                    className="inline-flex min-h-[38px] sm:min-h-[34px] items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-navy hover:bg-slate-100 cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>{isEditingDraft ? t("সম্পন্ন", "Done") : t("সম্পাদনা", "Edit")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSetDrafts((prev) => prev.filter((_, idx) => idx !== dIdx));
                      onSetEditingDraftIdx((prev) =>
                        prev === dIdx ? null : prev !== null && prev > dIdx ? prev - 1 : prev,
                      );
                    }}
                    className="min-h-[38px] sm:min-h-[34px] px-2.5 text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    {t("মুছুন", "Remove")}
                  </button>
                </div>
              </div>

              {isEditingDraft ? (
                <>
                  <textarea
                    rows={3}
                    value={draft.text}
                    onChange={(e) => {
                      const next = [...drafts];
                      next[dIdx] = { ...draft, text: e.target.value };
                      onSetDrafts(next);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm"
                  />

                  <div className="grid gap-2 sm:grid-cols-2">
                    {draft.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-2.5 py-2 ${
                          draft.correct_index === optIdx
                            ? "border-emerald-400 bg-emerald-50/60"
                            : "border-slate-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`draft-correct-${dIdx}`}
                          checked={draft.correct_index === optIdx}
                          onChange={() => {
                            const next = [...drafts];
                            next[dIdx] = { ...draft, correct_index: optIdx };
                            onSetDrafts(next);
                          }}
                          className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-emerald-600 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-600 shrink-0">
                          {optionLabel(optIdx, medium)}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...drafts];
                            const nextOpts = [...draft.options];
                            nextOpts[optIdx] = e.target.value;
                            next[dIdx] = { ...draft, options: nextOpts };
                            onSetDrafts(next);
                          }}
                          className="w-full bg-transparent text-base sm:text-sm text-slate-900 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[15px] sm:text-sm font-semibold leading-relaxed text-slate-900 break-words">
                    <MathText text={draft.text} />
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {draft.options.map((opt, optIdx) => {
                      const isCorrect = draft.correct_index === optIdx;
                      return (
                        <label
                          key={optIdx}
                          className={`flex min-h-[44px] items-center gap-2.5 rounded-lg border px-3 py-2 text-[14px] sm:text-xs cursor-pointer ${
                            isCorrect
                              ? "border-emerald-400 bg-emerald-50/60 font-semibold text-emerald-950"
                              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`draft-correct-${dIdx}`}
                            checked={isCorrect}
                            onChange={() => {
                              const next = [...drafts];
                              next[dIdx] = { ...draft, correct_index: optIdx };
                              onSetDrafts(next);
                            }}
                            className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-emerald-600 cursor-pointer"
                          />
                          <span className="font-semibold text-slate-600 shrink-0">
                            {optionLabel(optIdx, medium)}
                          </span>
                          <span className="min-w-0 flex-1 break-words leading-relaxed">
                            <MathText text={opt} />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        {showSaveToBankToggle && onSaveDraftsToBankChange ? (
          <label className="flex min-h-[40px] items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={saveDraftsToBank}
              onChange={(e) => onSaveDraftsToBankChange(e.target.checked)}
              className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
            />
            <span>
              {t(
                "অনুমোদিত Draft-গুলো Question Bank-এও Save করুন",
                "Also save approved drafts to Question Bank",
              )}
            </span>
          </label>
        ) : (
          <div />
        )}

        <button
          type="button"
          disabled={savingDrafts}
          onClick={onSaveAllDrafts}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
        >
          {savingDrafts ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>
            {confirmLabel ??
              t(
                `নিশ্চিত করে ${drafts.length}টি Draft Save করুন`,
                `Confirm & Save ${drafts.length} Draft(s)`,
              )}
          </span>
        </button>
      </div>
    </section>
  );
}
