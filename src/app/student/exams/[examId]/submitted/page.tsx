import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { AttemptStatus, ResultReleaseMode } from "@/lib/types";

interface SubmittedPageProps {
  params: Promise<{ examId: string }>;
}

export default async function ExamSubmittedPage({ params }: SubmittedPageProps) {
  const [ctx, lang] = await Promise.all([getCurrentUserContext(), getServerLang()]);
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  if (!ctx.configured || !ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "student") redirect("/teacher");

  const { examId } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data } = await supabase.rpc("get_student_submitted_summary", { p_exam_id: examId });
  const summary = data as {
    ok?: boolean;
    code?: string;
    exam?: {
      id: string;
      name: string;
      subject: string;
      result_release: ResultReleaseMode;
    };
    attempt?: {
      id: string;
      status: AttemptStatus;
      started_at: string;
      submitted_at: string;
      results_released: boolean;
      score: number | null;
      total_marks: number | null;
    };
  } | null;

  if (summary?.code === "IN_PROGRESS") {
    redirect(`/student/exams/${examId}/take`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-start sm:items-center justify-center px-3 py-6 sm:px-4 sm:py-10">
        {!summary?.ok || !summary.exam || !summary.attempt ? (
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-center space-y-4">
            <h1 className="text-xl font-bold text-navy">
              {t("Attempt পাওয়া যায়নি", "Attempt Not Found")}
            </h1>
            <Link
              href="/student"
              className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white"
            >
              {t("Student Dashboard-এ ফিরে যান", "Back to Student Dashboard")}
            </Link>
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8 space-y-5 sm:space-y-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {summary.attempt.status === "auto_submitted" ? "Auto-submitted" : "Submitted"}
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-navy">{summary.exam.name}</h1>
                <p className="text-xs text-slate-500">
                  {t("Submit সময়:", "Submitted at:")}{" "}
                  {new Date(summary.attempt.submitted_at).toLocaleString()}
                </p>
              </div>
            </div>

            {summary.attempt.results_released &&
            summary.attempt.score !== null &&
            summary.attempt.total_marks !== null ? (
              <div className="rounded-2xl bg-navy p-5 text-white flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-300">
                    {t("আপনার Score", "Your Score")}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-amber">
                    {summary.attempt.score}{" "}
                    <span className="text-lg font-semibold text-white">
                      / {summary.attempt.total_marks}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-300">
                    {t("শতকরা (Percentage)", "Percentage")}
                  </p>
                  <p className="text-2xl font-bold">
                    {summary.attempt.total_marks > 0
                      ? Math.round((summary.attempt.score / summary.attempt.total_marks) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <Clock className="h-4 w-4 text-navy shrink-0 mt-0.5" />
                <span>
                  {t("আপনার উত্তর Submit হয়েছে।", "Your answers have been submitted.")}{" "}
                  {summary.exam.result_release === "after_close"
                    ? t(
                        "Teacher Exam বন্ধ করার পর Result দেখা যাবে।",
                        "Results will be visible after the teacher closes the exam.",
                      )
                    : summary.exam.result_release === "manual"
                      ? t(
                          "Teacher প্রকাশ করার পর Result দেখা যাবে।",
                          "Results will be visible once released by your teacher.",
                        )
                      : t(
                          "এই Exam-এর Score শুধু Teacher দেখতে পারবেন।",
                          "Scores for this exam are visible to the teacher only.",
                        )}
                </span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
              {summary.attempt.results_released && (
                <Link
                  href={`/student/results/${summary.attempt.id}`}
                  className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
                >
                  {t("বিস্তারিত Result দেখুন", "View Detailed Results")}
                </Link>
              )}
              <Link
                href="/student"
                className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong"
              >
                {t("Student Dashboard-এ ফিরে যান", "Back to Student Dashboard")}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
