"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { MathText } from "@/components/math-text";
import { formatTimeTaken, type ExamAnalyticsSummary } from "@/lib/analytics";
import { exportQuestionsDocx, exportResultsCsv, exportResultsExcel } from "@/lib/exports";
import { createClient } from "@/lib/supabase/client";
import type { AttemptDetail, Exam, Question } from "@/lib/types";

interface ExamResultsClientProps {
  exam: Exam;
  questions: Question[];
  attempts: AttemptDetail[];
  analytics: ExamAnalyticsSummary;
}

function optionLabel(index: number, medium: "bn" | "en"): string {
  if (medium === "bn") {
    return ["ক", "খ", "গ", "ঘ", "ঙ", "চ"][index] ?? String(index + 1);
  }
  return String.fromCharCode(65 + index);
}

export function ExamResultsClient({
  exam,
  questions,
  attempts,
  analytics,
}: ExamResultsClientProps) {
  const router = useRouter();
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleReleaseManual() {
    const supabase = createClient();
    if (!supabase) return;
    setReleasing(true);
    const { error } = await supabase
      .from("exams")
      .update({ results_released_at: new Date().toISOString() })
      .eq("id", exam.id);
    setReleasing(false);
    if (!error) {
      setStatusMessage("Results released to students.");
      router.refresh();
    }
  }

  async function handleExcelExport() {
    setExportBusy("xlsx");
    try {
      await exportResultsExcel(exam, attempts);
    } finally {
      setExportBusy(null);
    }
  }

  async function handleDocxExport(includeAnswers: boolean) {
    setExportBusy(includeAnswers ? "docx-key" : "docx-paper");
    try {
      await exportQuestionsDocx(exam, questions, includeAnswers);
    } finally {
      setExportBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusMessage}
        </div>
      )}

      {/* Manual Release Banner */}
      {exam.result_release === "manual" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-amber-950">
            {exam.results_released_at ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Results released to students on{" "}
                {new Date(exam.results_released_at).toLocaleString()}.
              </span>
            ) : (
              <span>Results are set to manual release and currently hidden from students.</span>
            )}
          </div>
          {!exam.results_released_at && (
            <button
              type="button"
              disabled={releasing}
              onClick={handleReleaseManual}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
            >
              {releasing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Release Results Now</span>
            </button>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Submitted Attempts</p>
          <p className="mt-1 text-2xl font-bold text-navy">{analytics.submittedCount}</p>
          {analytics.inProgressCount > 0 && (
            <p className="text-xs text-slate-500">{analytics.inProgressCount} in progress</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Average Score</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {analytics.averageScore !== null ? analytics.averageScore : "—"}
          </p>
          <p className="text-xs text-slate-500">
            {analytics.averagePercentage !== null
              ? `${analytics.averagePercentage}% of ${analytics.totalMarks}`
              : `Out of ${analytics.totalMarks}`}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Highest Score</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {analytics.highestScore !== null ? analytics.highestScore : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Lowest Score</p>
          <p className="mt-1 text-2xl font-bold text-rose-700">
            {analytics.lowestScore !== null ? analytics.lowestScore : "—"}
          </p>
        </div>
      </section>

      {/* Client-Side Exports */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-bold text-navy">Export Results &amp; Question Paper</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Results Exports
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportResultsCsv(exam, attempts)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV (Excel Bangla)</span>
              </button>
              <button
                type="button"
                disabled={exportBusy !== null}
                onClick={handleExcelExport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                {exportBusy === "xlsx" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                )}
                <span>Excel (.xlsx)</span>
              </button>
              <Link
                href={`/teacher/exams/${exam.id}/print?mode=results`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5 text-navy" />
                <span>PDF (Print)</span>
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Question Paper &amp; Answer Key
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/teacher/exams/${exam.id}/print?mode=paper`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5 text-navy" />
                <span>Paper PDF</span>
              </Link>
              <Link
                href={`/teacher/exams/${exam.id}/print?mode=key`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5 text-emerald-700" />
                <span>Answer Key PDF</span>
              </Link>
              <button
                type="button"
                disabled={exportBusy !== null}
                onClick={() => handleDocxExport(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                {exportBusy === "docx-paper" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-navy" />
                )}
                <span>Paper (.docx)</span>
              </button>
              <button
                type="button"
                disabled={exportBusy !== null}
                onClick={() => handleDocxExport(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                {exportBusy === "docx-key" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-emerald-700" />
                )}
                <span>Key (.docx)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Student Scores Table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-navy">Student Results ({attempts.length})</h2>

        {attempts.length === 0 ? (
          <p className="text-sm text-slate-500">No attempts recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Roll</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">%</th>
                  <th className="py-2 pr-4">Time Taken</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Tab Switches</th>
                  <th className="py-2">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((a) => {
                  const pct =
                    a.score !== null && a.total_marks && Number(a.total_marks) > 0
                      ? `${((Number(a.score) / Number(a.total_marks)) * 100).toFixed(1)}%`
                      : "—";
                  const isOpen = expandedAttemptId === a.id;
                  const answerMap = a.answers ?? a.draft_answers ?? {};

                  return (
                    <Fragment key={a.id}>
                      <tr>
                        <td className="py-3 pr-4 font-medium text-slate-900">{a.student_name}</td>
                        <td className="py-3 pr-4 text-slate-600">{a.student_roll ?? "—"}</td>
                        <td className="py-3 pr-4 font-semibold text-slate-900">
                          {a.score !== null && a.total_marks !== null
                            ? `${a.score} / ${a.total_marks}`
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 text-slate-700">{pct}</td>
                        <td className="py-3 pr-4 text-xs text-slate-600">
                          {formatTimeTaken(a.started_at, a.submitted_at)}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-600">
                          {a.violation_counts?.tab_switches ?? 0}
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedAttemptId(isOpen ? null : a.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline cursor-pointer"
                          >
                            <span>{isOpen ? "Hide" : "Inspect"}</span>
                            {isOpen ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan={8} className="bg-slate-50 p-4">
                            <div className="space-y-2 text-xs">
                              <p className="font-semibold text-slate-700">
                                Submitted:{" "}
                                {a.submitted_at
                                  ? new Date(a.submitted_at).toLocaleString()
                                  : "In progress"}{" "}
                                • Blurs: {a.violation_counts?.blurs ?? 0} • Copy attempts:{" "}
                                {a.violation_counts?.copy_attempts ?? 0} • Away:{" "}
                                {a.violation_counts?.away_seconds ?? 0}s
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {questions.map((q, qIdx) => {
                                  const chosen = answerMap[q.id];
                                  const isAnswered = typeof chosen === "number";
                                  const isRight = isAnswered && chosen === q.correct_index;
                                  return (
                                    <div
                                      key={q.id}
                                      className={`rounded-lg border p-2.5 bg-white ${
                                        isRight
                                          ? "border-emerald-200"
                                          : isAnswered
                                            ? "border-rose-200"
                                            : "border-slate-200"
                                      }`}
                                    >
                                      <p className="font-medium text-slate-900">
                                        Q{qIdx + 1}: <MathText text={q.text} />
                                      </p>
                                      <p className="mt-1 text-slate-600">
                                        Chosen:{" "}
                                        <span className="font-semibold">
                                          {isAnswered
                                            ? `${optionLabel(chosen, exam.medium)}) ${q.options[chosen] ?? ""}`
                                            : "Unanswered"}
                                        </span>{" "}
                                        • Correct:{" "}
                                        <span className="font-semibold text-emerald-700">
                                          {optionLabel(q.correct_index, exam.medium)}
                                        </span>
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Per-Question Analytics */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-navy">Per-Question Analytics</h2>

        {analytics.perQuestion.length === 0 ? (
          <p className="text-sm text-slate-500">No questions in this exam.</p>
        ) : (
          <div className="space-y-4">
            {analytics.perQuestion.map((qa, idx) => (
              <div key={qa.questionId} className="rounded-xl border border-slate-200 p-4 space-y-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {idx + 1}. <MathText text={qa.text} />
                  </p>
                  <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-bold text-navy">
                    {qa.percentCorrect}% correct ({qa.correctCount}/{analytics.submittedCount})
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  {qa.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === qa.correctIndex;
                    const isTopWrong = optIdx === qa.mostChosenWrongIndex;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 ${
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : isTopWrong
                              ? "border-amber-300 bg-amber-50 text-amber-950"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="truncate">
                          {optionLabel(optIdx, exam.medium)}) <MathText text={opt} />
                        </span>
                        <span className="shrink-0 font-semibold">
                          {qa.optionCounts[optIdx]}
                          {isTopWrong && " (most common wrong)"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
