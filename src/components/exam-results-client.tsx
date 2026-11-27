"use client";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
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
  const [regrading, setRegrading] = useState(false);
  const [meritCopied, setMeritCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleCopyMeritList() {
    const ranked = attempts.filter((a) => a.score !== null && a.total_marks !== null);
    if (ranked.length === 0) return;
    const lines = ranked.map(
      (a, idx) =>
        `${idx + 1}. ${a.student_name}${a.student_roll ? ` (${a.student_roll})` : ""} — ${a.score}/${a.total_marks}`,
    );
    const text = `🏆 ${exam.name} — Merit List\n${lines.join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setMeritCopied(true);
      setTimeout(() => setMeritCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  }

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
      setStatusMessage("Student-দের জন্য Result প্রকাশ করা হয়েছে।");
      router.refresh();
    }
  }

  async function handleRegrade() {
    const supabase = createClient();
    if (!supabase) return;
    setRegrading(true);
    const { data, error } = await supabase.rpc("regrade_exam_attempts", {
      p_exam_id: exam.id,
    });
    setRegrading(false);
    if (!error) {
      setStatusMessage(`${Number(data ?? 0)}টি Submit করা Attempt পুনরায় মূল্যায়ন (Re-grade) করা হয়েছে।`);
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
    <div className="space-y-5 sm:space-y-6">
      {statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusMessage}
        </div>
      )}

      {/* Manual Release Banner */}
      {exam.result_release === "manual" && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-amber-950">
            {exam.results_released_at ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Student-দের জন্য Result প্রকাশিত হয়েছে (
                {new Date(exam.results_released_at).toLocaleString()})।
              </span>
            ) : (
              <span>Result বর্তমানে Manual release মোডে আছে এবং Student-দের থেকে লুকানো আছে।</span>
            )}
          </div>
          {!exam.results_released_at && (
            <button
              type="button"
              disabled={releasing}
              onClick={handleReleaseManual}
              className="inline-flex min-h-[42px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer shrink-0"
            >
              {releasing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>এখনই Result প্রকাশ করুন</span>
            </button>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
          <p className="text-xs text-slate-500">Submit হয়েছে</p>
          <p className="mt-1 text-2xl font-bold text-navy">{analytics.submittedCount}</p>
          {analytics.inProgressCount > 0 && (
            <p className="text-xs text-slate-500">{analytics.inProgressCount}টি চলমান</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
          <p className="text-xs text-slate-500">গড় Score</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {analytics.averageScore !== null ? analytics.averageScore : "—"}
          </p>
          <p className="text-xs text-slate-500">
            {analytics.averagePercentage !== null
              ? `${analytics.averagePercentage}% (মোট ${analytics.totalMarks})`
              : `মোট ${analytics.totalMarks}`}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
          <p className="text-xs text-slate-500">সর্বোচ্চ Score</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {analytics.highestScore !== null ? analytics.highestScore : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
          <p className="text-xs text-slate-500">সর্বনিম্ন Score</p>
          <p className="mt-1 text-2xl font-bold text-rose-700">
            {analytics.lowestScore !== null ? analytics.lowestScore : "—"}
          </p>
        </div>
      </section>

      {/* Client-Side Exports */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <h2 className="text-base font-bold text-navy">Result ও প্রশ্নপত্র Export করুন</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Result Export
            </p>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportResultsCsv(exam, attempts)}
                className="inline-flex min-h-[40px] items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>CSV (Excel)</span>
              </button>
              <button
                type="button"
                disabled={exportBusy !== null}
                onClick={handleExcelExport}
                className="inline-flex min-h-[40px] items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                {exportBusy === "xlsx" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                )}
                <span>Excel (.xlsx)</span>
              </button>
              <Link
                href={`/teacher/exams/${exam.id}/print?mode=results`}
                className="col-span-2 sm:col-span-1 inline-flex min-h-[40px] items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5 text-navy shrink-0" />
                <span>PDF (Print)</span>
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              প্রশ্নপত্র ও Answer Key
            </p>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <Link
                href={`/teacher/exams/${exam.id}/print?mode=paper`}
                className="inline-flex min-h-[40px] items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5 text-navy shrink-0" />
                <span>Paper PDF</span>
              </Link>
              <Link
                href={`/teacher/exams/${exam.id}/print?mode=key`}
                className="inline-flex min-h-[40px] items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>Key PDF</span>
              </Link>
              <button
                type="button"
                disabled={exportBusy !== null}
                onClick={() => handleDocxExport(false)}
                className="inline-flex min-h-[40px] items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                {exportBusy === "docx-paper" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-navy shrink-0" />
                )}
                <span>Paper (.docx)</span>
              </button>
              <button
                type="button"
                disabled={exportBusy !== null}
                onClick={() => handleDocxExport(true)}
                className="inline-flex min-h-[40px] items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                {exportBusy === "docx-key" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                )}
                <span>Key (.docx)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Student Scores Table / Mobile Cards */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-navy">Student-দের Result ({attempts.length})</h2>
          {analytics.submittedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMeritList}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50 cursor-pointer"
              >
                {meritCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{meritCopied ? "Copy হয়েছে" : "Merit List Copy করুন"}</span>
              </button>
              <button
                type="button"
                disabled={regrading}
                onClick={handleRegrade}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                {regrading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>Re-grade করুন</span>
              </button>
            </div>
          )}
        </div>

        {attempts.length === 0 ? (
          <p className="text-sm text-slate-500">এখনো কোনো Attempt রেকর্ড হয়নি।</p>
        ) : (
          <>
            {/* Mobile Results Cards */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {attempts.map((a, idx) => {
                const pct =
                  a.score !== null && a.total_marks && Number(a.total_marks) > 0
                    ? `${((Number(a.score) / Number(a.total_marks)) * 100).toFixed(1)}%`
                    : "—";
                const isOpen = expandedAttemptId === a.id;
                const answerMap = a.answers ?? a.draft_answers ?? {};
                const rankLabel = a.score !== null ? `#${idx + 1}` : null;

                return (
                  <div key={a.id} className="py-3.5 space-y-2.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {rankLabel && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                                idx === 0
                                  ? "bg-amber-100 text-amber-900"
                                  : idx <= 2
                                    ? "bg-navy/10 text-navy"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {rankLabel}
                            </span>
                          )}
                          <p className="truncate font-semibold text-slate-900">{a.student_name}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {a.student_roll ? `Roll: ${a.student_roll}` : "Roll নেই"} •{" "}
                          {formatTimeTaken(a.started_at, a.submitted_at)} •{" "}
                          <span className="capitalize">{a.status.replace("_", " ")}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-extrabold text-navy">
                          {a.score !== null && a.total_marks !== null
                            ? `${a.score}/${a.total_marks}`
                            : "—"}
                        </p>
                        <p className="text-xs font-medium text-slate-500">{pct}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500">
                        Switch: {a.violation_counts?.tab_switches ?? 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedAttemptId(isOpen ? null : a.id)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-navy hover:bg-slate-50 cursor-pointer"
                      >
                        <span>{isOpen ? "উত্তর লুকান" : "উত্তর দেখুন"}</span>
                        {isOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="rounded-xl bg-slate-50 p-3 space-y-2 text-xs">
                        <p className="font-semibold text-slate-700">
                          Submit:{" "}
                          {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "চলমান"}{" "}
                          • Blur: {a.violation_counts?.blurs ?? 0} • Copy:{" "}
                          {a.violation_counts?.copy_attempts ?? 0} • বাইরে:{" "}
                          {a.violation_counts?.away_seconds ?? 0}s
                        </p>
                        <div className="grid gap-2">
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
                                <p className="font-medium text-slate-900 break-words">
                                  Q{qIdx + 1}: <MathText text={q.text} />
                                </p>
                                <p className="mt-1 text-slate-600 break-words">
                                  উত্তর দিয়েছে:{" "}
                                  <span className="font-semibold">
                                    {isAnswered
                                      ? `${optionLabel(chosen, exam.medium)}) ${q.options[chosen] ?? ""}`
                                      : "উত্তর দেয়নি"}
                                  </span>{" "}
                                  • সঠিক:{" "}
                                  <span className="font-semibold text-emerald-700">
                                    {optionLabel(q.correct_index, exam.medium)}
                                  </span>
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Results Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="py-2 pr-3">Rank</th>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Roll</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">%</th>
                    <th className="py-2 pr-4">সময় লেগেছে</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Tab Switch</th>
                    <th className="py-2">বিস্তারিত</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempts.map((a, idx) => {
                    const pct =
                      a.score !== null && a.total_marks && Number(a.total_marks) > 0
                        ? `${((Number(a.score) / Number(a.total_marks)) * 100).toFixed(1)}%`
                        : "—";
                    const isOpen = expandedAttemptId === a.id;
                    const answerMap = a.answers ?? a.draft_answers ?? {};

                    return (
                      <Fragment key={a.id}>
                        <tr>
                          <td className="py-3 pr-3 font-bold text-navy">
                            {a.score !== null ? `#${idx + 1}` : "—"}
                          </td>
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
                              <span>{isOpen ? "লুকান" : "দেখুন"}</span>
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
                            <td colSpan={9} className="bg-slate-50 p-4">
                              <div className="space-y-2 text-xs">
                                <p className="font-semibold text-slate-700">
                                  Submit:{" "}
                                  {a.submitted_at
                                    ? new Date(a.submitted_at).toLocaleString()
                                    : "চলমান"}{" "}
                                  • Blur: {a.violation_counts?.blurs ?? 0} • Copy:{" "}
                                  {a.violation_counts?.copy_attempts ?? 0} • বাইরে:{" "}
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
                                          উত্তর:{" "}
                                          <span className="font-semibold">
                                            {isAnswered
                                              ? `${optionLabel(chosen, exam.medium)}) ${q.options[chosen] ?? ""}`
                                              : "উত্তর দেয়নি"}
                                          </span>{" "}
                                          • সঠিক:{" "}
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
          </>
        )}
      </section>

      {/* Per-Question Analytics */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-navy">প্রতি প্রশ্নের Analytics</h2>

        {analytics.perQuestion.length === 0 ? (
          <p className="text-sm text-slate-500">এই Exam-এ কোনো প্রশ্ন নেই।</p>
        ) : (
          <div className="space-y-4">
            {analytics.perQuestion.map((qa, idx) => (
              <div key={qa.questionId} className="rounded-xl border border-slate-200 p-3.5 sm:p-4 space-y-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900 break-words">
                    {idx + 1}. <MathText text={qa.text} />
                  </p>
                  <span className="shrink-0 rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-bold text-navy">
                    {qa.percentCorrect}% সঠিক ({qa.correctCount}/{analytics.submittedCount})
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  {qa.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === qa.correctIndex;
                    const isTopWrong = optIdx === qa.mostChosenWrongIndex;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-start sm:items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : isTopWrong
                              ? "border-amber-300 bg-amber-50 text-amber-950"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="min-w-0 break-words">
                          {optionLabel(optIdx, exam.medium)}) <MathText text={opt} />
                        </span>
                        <span className="shrink-0 font-semibold">
                          {qa.optionCounts[optIdx]}
                          {isTopWrong && " (সবচেয়ে বেশি ভুল)"}
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
