import { ArrowRight, ClipboardList, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { AttemptStatus, ExamMedium, ResultReleaseMode } from "@/lib/types";

interface HistoryItem {
  attempt_id: string;
  exam_id: string;
  exam_name: string;
  subject: string;
  medium: ExamMedium;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  result_release: ResultReleaseMode;
  show_answers: boolean;
  results_released: boolean;
  score: number | null;
  total_marks: number | null;
}

export default async function StudentResultsPage() {
  const ctx = await getCurrentUserContext();

  if (!ctx.configured) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl px-4 py-10">
          <SetupBanner />
        </main>
      </div>
    );
  }

  if (!ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "student") redirect("/teacher");

  const supabase = await createClient();
  const { data } = supabase ? await supabase.rpc("get_student_results_history") : { data: null };
  const payload = data as { ok?: boolean; items?: HistoryItem[] } | null;
  const items = payload?.items ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">My Results</h1>
            <p className="text-sm text-slate-600">
              Attempt history with released scores and answer explanations.
            </p>
          </div>
          <Link href="/student" className="text-sm font-semibold text-navy hover:underline">
            ← Back to Student Home
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />
            <p className="text-base font-semibold text-slate-800">No exam attempts yet</p>
            <p className="text-sm text-slate-500">
              Join an exam from your dashboard using a Teacher Code and Exam Code.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const pct =
                item.results_released &&
                item.score !== null &&
                item.total_marks &&
                Number(item.total_marks) > 0
                  ? Math.round((Number(item.score) / Number(item.total_marks)) * 100)
                  : null;

              return (
                <div
                  key={item.attempt_id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{item.exam_name}</h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                        {item.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {item.subject || "General"} • {item.medium === "bn" ? "Bangla" : "English"} •{" "}
                      {item.submitted_at
                        ? `Submitted ${new Date(item.submitted_at).toLocaleString()}`
                        : `Started ${new Date(item.started_at).toLocaleString()}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {item.status === "in_progress" ? (
                      <Link
                        href={`/student/exams/${item.exam_id}/take`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
                      >
                        <span>Resume Exam</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <>
                        {item.results_released && item.score !== null && item.total_marks !== null ? (
                          <div className="text-right">
                            <p className="text-base font-extrabold text-navy">
                              {item.score} / {item.total_marks}
                            </p>
                            {pct !== null && (
                              <p className="text-xs font-medium text-emerald-700">{pct}%</p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {item.result_release === "teacher_only"
                                ? "Private to teacher"
                                : "Pending release"}
                            </span>
                          </span>
                        )}

                        <Link
                          href={`/student/results/${item.attempt_id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-navy hover:bg-slate-50"
                        >
                          <span>Details</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
