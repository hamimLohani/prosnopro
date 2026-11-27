import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { AttemptStatus, ResultReleaseMode } from "@/lib/types";

interface SubmittedPageProps {
  params: Promise<{ examId: string }>;
}

export default async function ExamSubmittedPage({ params }: SubmittedPageProps) {
  const ctx = await getCurrentUserContext();
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
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-10">
        {!summary?.ok || !summary.exam || !summary.attempt ? (
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4">
            <h1 className="text-xl font-bold text-navy">Attempt not found</h1>
            <Link
              href="/student"
              className="inline-block rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Student Dashboard
            </Link>
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {summary.attempt.status === "auto_submitted" ? "Auto-submitted" : "Submitted"}
                </p>
                <h1 className="text-2xl font-bold text-navy">{summary.exam.name}</h1>
                <p className="text-xs text-slate-500">
                  Submitted at {new Date(summary.attempt.submitted_at).toLocaleString()}
                </p>
              </div>
            </div>

            {summary.attempt.results_released &&
            summary.attempt.score !== null &&
            summary.attempt.total_marks !== null ? (
              <div className="rounded-2xl bg-navy p-5 text-white flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-300">Your Score</p>
                  <p className="mt-1 text-3xl font-extrabold text-amber">
                    {summary.attempt.score}{" "}
                    <span className="text-lg font-semibold text-white">
                      / {summary.attempt.total_marks}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-300">Percentage</p>
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
                  Your submission is recorded.{" "}
                  {summary.exam.result_release === "after_close"
                    ? "Results will appear after the teacher closes the exam."
                    : summary.exam.result_release === "manual"
                      ? "Results will appear once your teacher releases them."
                      : "Scores are kept private to the teacher for this exam."}
                </span>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              {summary.attempt.results_released && (
                <Link
                  href={`/student/results/${summary.attempt.id}`}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
                >
                  View Result Details
                </Link>
              )}
              <Link
                href="/student"
                className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong"
              >
                Back to Student Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
