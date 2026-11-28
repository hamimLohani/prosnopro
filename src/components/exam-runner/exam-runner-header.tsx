"use client";

import { CheckCircle2, Clock, CloudOff, CloudUpload, Grid, Loader2, Send } from "lucide-react";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";
import type { StudentExamQuestion } from "@/lib/types";

export type RunnerSyncState = "synced" | "unsaved" | "syncing" | "offline";

function formatRemaining(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

interface ExamRunnerHeaderProps {
  headerRef: React.RefObject<HTMLElement | null>;
  examName: string;
  answeredCount: number;
  questions: StudentExamQuestion[];
  answers: Record<string, number>;
  flaggedIds: Record<string, boolean>;
  nextUnansweredQuestion: StudentExamQuestion | null;
  nextUnansweredIdx: number;
  syncState: RunnerSyncState;
  remainingSeconds: number;
  isLowTime: boolean;
  showNavDrawer: boolean;
  submitting: boolean;
  onToggleDrawer: () => void;
  onCloseDrawer: () => void;
  onJumpToQuestion: (id: string) => void;
  onOpenSubmit: () => void;
}

export function ExamRunnerHeader({
  headerRef,
  examName,
  answeredCount,
  questions,
  answers,
  flaggedIds,
  nextUnansweredQuestion,
  nextUnansweredIdx,
  syncState,
  remainingSeconds,
  isLowTime,
  showNavDrawer,
  submitting,
  onToggleDrawer,
  onCloseDrawer,
  onJumpToQuestion,
  onOpenSubmit,
}: ExamRunnerHeaderProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  return (
    <header ref={headerRef} className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-navy sm:text-base">{examName}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-slate-500">
            <span>
              {t(
                `${answeredCount}/${questions.length}টি উত্তর`,
                `${answeredCount}/${questions.length} answered`,
              )}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              {syncState === "synced" && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{t("সংরক্ষিত", "Synced")}</span>
                </>
              )}
              {syncState === "unsaved" && (
                <>
                  <CloudUpload className="h-3.5 w-3.5 text-amber-600" />
                  <span>{t("ফোনে Save আছে", "Saved locally")}</span>
                </>
              )}
              {syncState === "syncing" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-navy" />
                  <span>{t("ব্যাকআপ হচ্ছে...", "Backing up...")}</span>
                </>
              )}
              {syncState === "offline" && (
                <>
                  <CloudOff className="h-3.5 w-3.5 text-rose-600" />
                  <span>{t("Offline — ফোনে Save আছে", "Offline — saved locally")}</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 font-mono text-sm font-bold tabular-nums ${
              isLowTime
                ? "border border-rose-300 bg-rose-100 text-rose-800"
                : "bg-navy/10 text-navy"
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span>{formatRemaining(remainingSeconds)}</span>
          </div>

          <button
            type="button"
            aria-expanded={showNavDrawer}
            onClick={onToggleDrawer}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 active:bg-slate-100 lg:hidden cursor-pointer"
          >
            <Grid className="h-4 w-4" />
            <span>{t("ম্যাপ", "Map")}</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={onOpenSubmit}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-navy px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-navy-strong cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{t("জমা দিন", "Submit")}</span>
          </button>
        </div>
      </div>

      {showNavDrawer && (
        <>
          <div
            onClick={onCloseDrawer}
            aria-hidden="true"
            className="fixed inset-x-0 top-14 bottom-0 z-20 bg-slate-900/20 lg:hidden"
          />
          <div className="relative z-30 max-h-[55vh] overflow-y-auto overscroll-contain border-t border-slate-200 bg-slate-50 px-3 py-3 sm:px-4 lg:hidden">
            <div className="mb-2.5 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700">
                {t(
                  `প্রশ্ন (${answeredCount}/${questions.length}টি উত্তর)`,
                  `Questions (${answeredCount}/${questions.length} answered)`,
                )}
              </span>
              {nextUnansweredQuestion && (
                <button
                  type="button"
                  onClick={() => onJumpToQuestion(nextUnansweredQuestion.id)}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-semibold text-amber-900 active:bg-amber-100 cursor-pointer"
                >
                  {t(`পরবর্তী #${nextUnansweredIdx + 1} →`, `Next #${nextUnansweredIdx + 1} →`)}
                </button>
              )}
            </div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
              {questions.map((q, idx) => {
                const answered = typeof answers[q.id] === "number";
                const flagged = Boolean(flaggedIds[q.id]);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onJumpToQuestion(q.id)}
                    className={`h-10 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer ${
                      answered && flagged
                        ? "border-2 border-amber-400 bg-navy text-white"
                        : flagged
                          ? "border border-amber-400 bg-amber-100 text-amber-900"
                          : answered
                            ? "bg-navy text-white"
                            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Slim Live Progress Bar */}
      <div className="h-1 w-full bg-slate-100" aria-hidden="true">
        <div
          className={`h-full transition-all duration-300 ${
            questions.length > 0 && answeredCount === questions.length
              ? "bg-emerald-600"
              : "bg-navy"
          }`}
          style={{
            width: `${
              questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0
            }%`,
          }}
        />
      </div>
    </header>
  );
}
