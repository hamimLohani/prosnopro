import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExamMonitorClient } from "@/components/exam-monitor-client";
import { Navbar } from "@/components/navbar";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { AttemptDetail, EntryEvent, Exam } from "@/lib/types";

interface MonitorPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamMonitorPage({ params }: MonitorPageProps) {
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

  const [{ data: attempts }, { data: events }] = await Promise.all([
    supabase
      .from("attempts")
      .select(
        "id, exam_id, student_id, student_name, student_roll, started_at, deadline_at, submitted_at, status, answers, draft_answers, score, total_marks, violation_counts",
      )
      .eq("exam_id", exam.id)
      .order("started_at", { ascending: false })
      .returns<AttemptDetail[]>(),
    supabase
      .from("entry_events")
      .select("*")
      .eq("exam_id", exam.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<EntryEvent[]>(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Live Monitor • {exam.code}
            </p>
            <h1 className="text-2xl font-bold text-navy">{exam.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/teacher/exams/${exam.id}/results`}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Results &amp; Analytics
            </Link>
            <Link
              href={`/teacher/exams/${exam.id}`}
              className="text-sm font-semibold text-navy hover:underline"
            >
              ← Back to Exam
            </Link>
          </div>
        </div>

        <ExamMonitorClient attempts={attempts ?? []} events={events ?? []} />
      </main>
    </div>
  );
}
