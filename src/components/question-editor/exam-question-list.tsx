"use client";

import { ArrowDown, ArrowUp, BookOpen, CheckCircle2, Loader2, Pencil, Trash2 } from "lucide-react";
import { useLang } from "@/components/language-provider";
import { MathText } from "@/components/math-text";
import { pickText } from "@/lib/i18n";
import { optionLabel } from "@/lib/mcq";
import type { ExamMedium, Question } from "@/lib/types";

interface ExamQuestionListProps {
  questions: Question[];
  medium: ExamMedium;
  hasAttempts: boolean;
  busy: boolean;
  savingToBankKey: string | null;
  onSaveToBank: (targets: Question[], key: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onEdit: (question: Question) => void;
  onRequestDelete: (question: Question) => void;
}

export function ExamQuestionList({
  questions,
  medium,
  hasAttempts,
  busy,
  savingToBankKey,
  onSaveToBank,
  onMove,
  onEdit,
  onRequestDelete,
}: ExamQuestionListProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900">
          {t(`প্রশ্নসমূহ (${questions.length}টি)`, `Questions (${questions.length})`)}
        </h2>
        {questions.some((q) => !q.bank_id) && (
          <button
            type="button"
            disabled={savingToBankKey !== null || busy}
            onClick={() => onSaveToBank(questions, "all")}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            {savingToBankKey === "all" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BookOpen className="h-3.5 w-3.5" />
            )}
            <span>
              {t(
                `সবগুলো Bank-এ Save করুন (${questions.filter((q) => !q.bank_id).length})`,
                `Save All to Bank (${questions.filter((q) => !q.bank_id).length})`,
              )}
            </span>
          </button>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {t(
            "এখনো কোনো প্রশ্ন যোগ করা হয়নি। Manual, AI Key অথবা PDF Import দিয়ে প্রশ্ন যোগ করুন।",
            "No questions added yet. Add questions using Manual entry, AI Key, or PDF Import.",
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    {t(
                      `প্রশ্ন ${idx + 1} • ${q.marks} নম্বর`,
                      `Question ${idx + 1} • ${q.marks} pt(s)`,
                    )}
                  </span>

                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    {q.bank_id ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 mr-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{t("Bank-এ আছে", "In Bank")}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={savingToBankKey !== null || busy}
                        onClick={() => onSaveToBank([q], q.id)}
                        title={t("Question Bank-এ Save করুন", "Save to Question Bank")}
                        className="inline-flex min-h-[38px] sm:min-h-[32px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-navy hover:bg-slate-50 disabled:opacity-40 cursor-pointer mr-1"
                      >
                        {savingToBankKey === q.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <BookOpen className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {t("Bank-এ Save", "Save to Bank")}
                        </span>
                      </button>
                    )}
                    {!hasAttempts && (
                      <>
                        <button
                          type="button"
                          disabled={idx === 0 || busy}
                          onClick={() => onMove(idx, -1)}
                          title={t("উপরে নিন", "Move up")}
                          aria-label={t("উপরে নিন", "Move up")}
                          className="inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === questions.length - 1 || busy}
                          onClick={() => onMove(idx, 1)}
                          title={t("নিচে নিন", "Move down")}
                          aria-label={t("নিচে নিন", "Move down")}
                          className="inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onEdit(q)}
                      title={t("Edit করুন", "Edit")}
                      aria-label={t("Edit করুন", "Edit")}
                      className="inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!hasAttempts && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onRequestDelete(q)}
                        title={t("মুছুন", "Delete")}
                        aria-label={t("মুছুন", "Delete")}
                        className="inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[15px] sm:text-sm font-semibold text-slate-900 leading-relaxed break-words">
                  <MathText text={q.text} />
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, optIdx) => {
                  const isCorrect = optIdx === q.correct_index;
                  return (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 sm:py-2 text-[13px] sm:text-xs ${
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-900"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {isCorrect && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span className="min-w-0 break-words">
                        {optionLabel(optIdx, medium)}) <MathText text={opt} />
                      </span>
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-semibold text-navy">{t("ব্যাখ্যা:", "Explanation:")}</span>{" "}
                  <MathText text={q.explanation} />
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
