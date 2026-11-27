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
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">আমার Result</h1>
            <p className="text-sm text-slate-600">
              আপনার আগের Exam-গুলোর Score এবং সঠিক উত্তরের ব্যাখ্যা।
            </p>
          </div>
          <Link href="/student" className="py-1 text-sm font-semibold text-navy hover:underline">
            ← Student Home-এ ফিরে যান
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-10 text-center space-y-3">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />
            <p className="text-base font-semibold text-slate-800">এখনো কোনো Exam দেওয়া হয়নি</p>
            <p className="text-sm text-slate-500">
              Dashboard থেকে Teacher Code এবং Exam Code দিয়ে একটি Exam-এ জয়েন করুন।
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
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{item.exam_name}</h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                        {item.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {item.subject || "General"} • {item.medium === "bn" ? "বাংলা" : "English"} •{" "}
                      {item.submitted_at
                        ? `Submit: ${new Date(item.submitted_at).toLocaleString()}`
                        : `শুরু: ${new Date(item.started_at).toLocaleString()}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                    {item.status === "in_progress" ? (
                      <Link
                        href={`/student/exams/${item.exam_id}/take`}
                        className="inline-flex min-h-[40px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
                      >
                        <span>Exam চালিয়ে যান</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <>
                        {item.results_released && item.score !== null && item.total_marks !== null ? (
                          <div className="text-left sm:text-right">
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
                                ? "শুধু Teacher-এর জন্য"
                                : "প্রকাশের অপেক্ষায়"}
                            </span>
                          </span>
                        )}

                        <Link
                          href={`/student/results/${item.attempt_id}`}
                          className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-navy hover:bg-slate-50"
                        >
                          <span>বিস্তারিত</span>
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
