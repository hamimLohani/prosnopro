import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExamResultsClient } from "@/components/exam-results-client";
import { Navbar } from "@/components/navbar";
import { computeExamAnalytics } from "@/lib/analytics";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { AttemptDetail, Exam, Question } from "@/lib/types";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamResultsPage({ params }: ResultsPageProps) {
  const ctx = await getCurrentUserContext();
  if (!ctx.configured || !ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "teacher") redirect("/student");

  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  await supabase.rpc("finalize_expired_attempts");

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
  const analytics = computeExamAnalytics(qList, attemptList);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Results, Analytics &amp; Exports • {exam.code}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-navy break-words">{exam.name}</h1>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <Link
              href={`/teacher/exams/${exam.id}/monitor`}
              className="inline-flex min-h-[40px] items-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Live Monitor
            </Link>
            <Link
              href={`/teacher/exams/${exam.id}`}
              className="py-1 text-sm font-semibold text-navy hover:underline"
            >
              ← Back to Exam
            </Link>
          </div>
        </div>

        <ExamResultsClient
          exam={exam}
          questions={qList}
          attempts={attemptList}
          analytics={analytics}
        />
      </main>
    </div>
  );
}
