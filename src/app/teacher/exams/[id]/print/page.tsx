import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MathText } from "@/components/math-text";
import { PrintExportActions } from "@/components/print-export-actions";
import { computeExamAnalytics, formatTimeTaken } from "@/lib/analytics";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { AttemptDetail, Exam, Question } from "@/lib/types";

interface PrintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

function optionLabel(index: number, medium: "bn" | "en"): string {
  if (medium === "bn") {
    return ["ক", "খ", "গ", "ঘ", "ঙ", "চ"][index] ?? String(index + 1);
  }
  return String.fromCharCode(65 + index);
}

export default async function ExamPrintPage({ params, searchParams }: PrintPageProps) {
  const [ctx, lang] = await Promise.all([getCurrentUserContext(), getServerLang()]);
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  if (!ctx.configured || !ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "teacher") redirect("/student");

  const { id } = await params;
  const sp = await searchParams;
  const mode = sp.mode === "key" ? "key" : sp.mode === "results" ? "results" : "paper";

  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", ctx.userId)
    .maybeSingle<Exam>();

  if (!exam) notFound();

  const [{ data: questions }, { data: attempts }] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .eq("exam_id", exam.id)
      .order("position", { ascending: true })
      .returns<Question[]>(),
    supabase
      .from("attempts")
      .select(
        "id, exam_id, student_id, student_name, student_roll, started_at, deadline_at, submitted_at, status, answers, draft_answers, score, total_marks, violation_counts",
      )
      .eq("exam_id", exam.id)
      .order("score", { ascending: false, nullsFirst: false })
      .returns<AttemptDetail[]>(),
  ]);

  const qList = questions ?? [];
  const attemptList = attempts ?? [];
  const totalMarks = qList.reduce((sum, q) => sum + Number(q.marks), 0);
  const analytics = mode === "results" ? computeExamAnalytics(qList, attemptList) : null;

  return (
    <div className="min-h-screen bg-slate-100 py-4 px-3 sm:py-8 sm:px-4 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 sm:mb-6 flex max-w-4xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/teacher/exams/${exam.id}/print?mode=paper`}
              className={`inline-flex min-h-[34px] items-center rounded-lg px-3 py-1.5 font-semibold ${
                mode === "paper" ? "bg-navy text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Question Paper
            </Link>
            <Link
              href={`/teacher/exams/${exam.id}/print?mode=key`}
              className={`inline-flex min-h-[34px] items-center rounded-lg px-3 py-1.5 font-semibold ${
                mode === "key" ? "bg-navy text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Answer Key
            </Link>
            <Link
              href={`/teacher/exams/${exam.id}/print?mode=results`}
              className={`inline-flex min-h-[34px] items-center rounded-lg px-3 py-1.5 font-semibold ${
                mode === "results" ? "bg-navy text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Results Sheet
            </Link>
          </div>
          <Link
            href={`/teacher/exams/${exam.id}/results`}
            className="inline-flex min-h-[34px] items-center font-semibold text-navy hover:underline"
          >
            {t("← Result-এ ফিরে যান", "← Back to Results")}
          </Link>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <PrintExportActions mode={mode} exam={exam} questions={qList} attempts={attemptList} />
        </div>
      </div>

      <article className="print-only-sheet mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
        <header className="border-b-2 border-slate-900 pb-4 mb-5 sm:mb-6 flex flex-wrap items-baseline justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">{exam.name}</h1>
            <p className="text-xs sm:text-sm text-slate-700">
              {exam.class ? `${exam.class} • ` : ""}
              {exam.subject || "General"} •{" "}
              {exam.medium === "bn" ? t("বাংলা", "Bangla") : "English"} • Time:{" "}
              {exam.duration_minutes} min • Total Marks: {totalMarks}
              {exam.negative_marking ? ` • Negative: -${exam.negative_value}` : ""}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Teacher: {ctx.profile.name} ({ctx.teacherProfile?.teacher_code ?? ""}) • Exam Code:{" "}
              {exam.code}
            </p>
          </div>
          <span className="shrink-0 rounded border border-slate-400 px-2.5 py-1 font-mono text-xs font-bold uppercase text-slate-800">
            {mode === "key" ? "ANSWER KEY" : mode === "results" ? "RESULTS" : "QUESTION PAPER"}
          </span>
        </header>

        {mode === "results" ? (
          <div className="space-y-5 sm:space-y-6">
            {analytics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2.5 sm:gap-3 text-center text-xs">
                <div className="rounded border border-slate-300 p-2.5">
                  <div className="text-slate-500">Submitted</div>
                  <div className="text-base font-bold">{analytics.submittedCount}</div>
                </div>
                <div className="rounded border border-slate-300 p-2.5">
                  <div className="text-slate-500">Average</div>
                  <div className="text-base font-bold">
                    {analytics.averageScore ?? "—"} ({analytics.averagePercentage ?? 0}%)
                  </div>
                </div>
                <div className="rounded border border-slate-300 p-2.5">
                  <div className="text-slate-500">Highest</div>
                  <div className="text-base font-bold">{analytics.highestScore ?? "—"}</div>
                </div>
                <div className="rounded border border-slate-300 p-2.5">
                  <div className="text-slate-500">Lowest</div>
                  <div className="text-base font-bold">{analytics.lowestScore ?? "—"}</div>
                </div>
              </div>
            )}

            {/* Mobile Card View */}
            <div className="space-y-2.5 sm:hidden print:hidden">
              {attemptList.map((a, idx) => {
                const pct =
                  a.score !== null && a.total_marks && a.total_marks > 0
                    ? ((Number(a.score) / Number(a.total_marks)) * 100).toFixed(1)
                    : "—";
                return (
                  <div
                    key={a.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 break-words">
                          #{idx + 1} {a.student_name}
                        </p>
                        <p className="text-slate-500">
                          Roll/ID: {a.student_roll ?? "—"} •{" "}
                          <span className="capitalize">{a.status.replace("_", " ")}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-navy">
                          {a.score !== null && a.total_marks !== null
                            ? `${a.score} / ${a.total_marks}`
                            : "—"}
                        </p>
                        <p className="text-slate-500">{pct === "—" ? "—" : `${pct}%`}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-[11px] text-slate-500">
                      <span>Time: {formatTimeTaken(a.started_at, a.submitted_at)}</span>
                      <span>Switches: {a.violation_counts?.tab_switches ?? 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop & Print Table */}
            <div className="hidden sm:block print:block overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-800">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Roll / ID</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">%</th>
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2">Switches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attemptList.map((a, idx) => {
                    const pct =
                      a.score !== null && a.total_marks && a.total_marks > 0
                        ? ((Number(a.score) / Number(a.total_marks)) * 100).toFixed(1)
                        : "—";
                    return (
                      <tr key={a.id}>
                        <td className="py-2 pr-3">{idx + 1}</td>
                        <td className="py-2 pr-3 font-semibold">{a.student_name}</td>
                        <td className="py-2 pr-3">{a.student_roll ?? "—"}</td>
                        <td className="py-2 pr-3 capitalize">{a.status.replace("_", " ")}</td>
                        <td className="py-2 pr-3 font-semibold">
                          {a.score !== null && a.total_marks !== null
                            ? `${a.score} / ${a.total_marks}`
                            : "—"}
                        </td>
                        <td className="py-2 pr-3">{pct === "—" ? "—" : `${pct}%`}</td>
                        <td className="py-2 pr-3">{formatTimeTaken(a.started_at, a.submitted_at)}</td>
                        <td className="py-2">{a.violation_counts?.tab_switches ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {exam.instructions && mode === "paper" && (
              <p className="rounded border border-slate-300 bg-slate-50 p-3 text-xs text-slate-700">
                <span className="font-bold">Instructions:</span> {exam.instructions}
              </p>
            )}

            <ol className="space-y-5 text-sm text-slate-900">
              {qList.map((q, idx) => (
                <li key={q.id} className="space-y-2 break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold leading-relaxed">
                      {idx + 1}. <MathText text={q.text} />
                    </p>
                    <span className="shrink-0 text-xs text-slate-500">[{q.marks}]</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6 gap-y-1.5 pl-4 text-slate-800">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = mode === "key" && optIdx === q.correct_index;
                      return (
                        <div
                          key={optIdx}
                          className={isCorrect ? "font-bold text-emerald-800 underline" : ""}
                        >
                          {optionLabel(optIdx, exam.medium)}) <MathText text={opt} />
                        </div>
                      );
                    })}
                  </div>

                  {mode === "key" && (
                    <div className="pl-4 text-xs text-emerald-800 space-y-0.5">
                      <p className="font-semibold">
                        Correct: {optionLabel(q.correct_index, exam.medium)}
                      </p>
                      {q.explanation && (
                        <p className="text-slate-600">
                          Explanation: <MathText text={q.explanation} />
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        <footer className="mt-8 border-t border-slate-300 pt-3 text-center text-xs font-medium text-slate-500">
          Prepared by ProsnoPro
        </footer>
      </article>
    </div>
  );
}
