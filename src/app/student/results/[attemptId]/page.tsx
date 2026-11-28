import { CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MathText } from "@/components/math-text";
import { Navbar } from "@/components/navbar";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { AttemptStatus, ExamMedium, ResultReleaseMode } from "@/lib/types";

interface ResultDetailPageProps {
  params: Promise<{ attemptId: string }>;
}

interface ResultQuestionDetail {
  id: string;
  text: string;
  options: string[];
  marks: number;
  chosen_index: number | null;
  correct_index: number | null;
  explanation: string | null;
}

function optionLabel(index: number, medium: ExamMedium): string {
  if (medium === "bn") {
    return ["ক", "খ", "গ", "ঘ", "ঙ", "চ"][index] ?? String(index + 1);
  }
  return String.fromCharCode(65 + index);
}

export default async function StudentResultDetailPage({ params }: ResultDetailPageProps) {
  const [ctx, lang] = await Promise.all([getCurrentUserContext(), getServerLang()]);
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  if (!ctx.configured || !ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "student") redirect("/teacher");

  const { attemptId } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data } = await supabase.rpc("get_student_result_detail", { p_attempt_id: attemptId });
  const detail = data as {
    ok?: boolean;
    code?: string;
    exam_id?: string;
    exam?: {
      id: string;
      name: string;
      subject: string;
      medium: ExamMedium;
      negative_marking: boolean;
      negative_value: number;
      result_release: ResultReleaseMode;
      show_answers: boolean;
    };
    attempt?: {
      id: string;
      status: AttemptStatus;
      started_at: string;
      submitted_at: string | null;
      results_released: boolean;
      score: number | null;
      total_marks: number | null;
    };
    questions?: ResultQuestionDetail[];
  } | null;

  if (detail?.code === "IN_PROGRESS" && detail.exam_id) {
    redirect(`/student/exams/${detail.exam_id}/take`);
  }

  if (!detail?.ok || !detail.exam || !detail.attempt) {
    notFound();
  }

  const { exam, attempt } = detail;
  const questions = detail.questions ?? [];
  const pct =
    attempt.results_released &&
    attempt.score !== null &&
    attempt.total_marks &&
    Number(attempt.total_marks) > 0
      ? ((Number(attempt.score) / Number(attempt.total_marks)) * 100).toFixed(1)
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {exam.subject || "General"} •{" "}
              {exam.medium === "bn" ? t("বাংলা", "Bangla") : "English"}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">{exam.name}</h1>
          </div>
          <Link href="/student/results" className="py-1 text-sm font-semibold text-navy hover:underline">
            {t("← আমার Result-এ ফিরে যান", "← Back to My Results")}
          </Link>
        </div>

        {attempt.results_released && attempt.score !== null && attempt.total_marks !== null ? (
          <section className="rounded-2xl bg-navy p-5 sm:p-6 text-white flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-300">
                {t("চূড়ান্ত Score", "Final Score")}
              </p>
              <p className="mt-1 text-3xl font-extrabold text-amber">
                {attempt.score}{" "}
                <span className="text-lg font-semibold text-white">/ {attempt.total_marks}</span>
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Status: {attempt.status.replace("_", " ")}
                {attempt.submitted_at
                  ? ` • ${t("Submit:", "Submitted:")} ${new Date(attempt.submitted_at).toLocaleString()}`
                  : ""}
              </p>
            </div>
            {pct !== null && (
              <div className="rounded-xl bg-white/10 px-4 py-2.5 sm:px-5 sm:py-3 text-right">
                <p className="text-xs text-slate-300">{t("শতকরা", "Percentage")}</p>
                <p className="text-xl sm:text-2xl font-bold">{pct}%</p>
              </div>
            )}
          </section>
        ) : (
          <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-sm text-slate-700">
            <Clock className="h-5 w-5 text-navy shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">
                {t("Result এখনো প্রকাশ হয়নি", "Results Not Released Yet")}
              </p>
              <p className="mt-1 text-slate-600">
                {exam.result_release === "after_close"
                  ? t(
                      "Teacher Exam বন্ধ করার পর Score ও উত্তর দেখা যাবে।",
                      "Scores and answers will be available after the teacher closes this exam.",
                    )
                  : exam.result_release === "manual"
                    ? t(
                        "Teacher Result প্রকাশ করার পর Score দেখা যাবে।",
                        "Scores will be visible once your teacher releases results.",
                      )
                    : t(
                        "এই Exam-এর Score শুধু Teacher-এর জন্য সংরক্ষিত।",
                        "Scores for this exam are visible to the teacher only.",
                      )}
              </p>
            </div>
          </section>
        )}

        {attempt.results_released && !exam.show_answers && (
          <section className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-sm text-slate-600">
            <Lock className="h-4 w-4 text-slate-500 shrink-0" />
            <span>
              {t(
                "আপনার Teacher এই Exam-এর সঠিক উত্তর ও ব্যাখ্যা প্রদর্শন বন্ধ রেখেছেন।",
                "Your teacher has disabled answer and explanation review for this exam.",
              )}
            </span>
          </section>
        )}

        {attempt.results_released && exam.show_answers && questions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-bold text-navy">
              {t("উত্তর পর্যালোচনা ও ব্যাখ্যা", "Answer Review & Explanations")}
            </h2>

            {questions.map((q, idx) => {
              const isAnswered = q.chosen_index !== null;
              const isCorrect =
                isAnswered && q.correct_index !== null && q.chosen_index === q.correct_index;

              return (
                <article
                  key={q.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold leading-relaxed text-slate-900 sm:text-base">
                      {idx + 1}. <MathText text={q.text} />
                    </p>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-800"
                          : isAnswered
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> +{q.marks}
                        </>
                      ) : isAnswered ? (
                        <>
                          <XCircle className="h-3.5 w-3.5" />{" "}
                          {exam.negative_marking ? `-${exam.negative_value}` : "0"}
                        </>
                      ) : (
                        "Unanswered (0)"
                      )}
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 text-[15px] sm:text-sm">
                    {q.options.map((opt, optIdx) => {
                      const isCorrectOpt = q.correct_index === optIdx;
                      const isChosenOpt = q.chosen_index === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`rounded-xl border px-3.5 py-2.5 leading-relaxed ${
                            isCorrectOpt
                              ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-950"
                              : isChosenOpt
                                ? "border-rose-300 bg-rose-50 text-rose-900"
                                : "border-slate-200 text-slate-700"
                          }`}
                        >
                          <span className="mr-1.5 font-semibold">
                            {optionLabel(optIdx, exam.medium)})
                          </span>
                          <MathText text={opt} />
                          {isChosenOpt && (
                            <span className="ml-2 text-xs font-semibold">(Your answer)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                      <span className="font-semibold text-navy">Explanation:</span>{" "}
                      <MathText text={q.explanation} />
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
