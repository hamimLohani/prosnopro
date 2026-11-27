import { ArrowRight, ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { StudentJoinForm } from "@/components/student-join-form";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { AttemptStatus } from "@/lib/types";

interface StudentAttemptRow {
  id: string;
  exam_id: string;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
}

export default async function StudentDashboardPage() {
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
  if (supabase) {
    await supabase.rpc("finalize_expired_attempts");
  }

  const { data: attempts } = supabase
    ? await supabase
        .from("attempts")
        .select("id, exam_id, status, started_at, submitted_at")
        .eq("student_id", ctx.userId)
        .order("started_at", { ascending: false })
        .limit(10)
        .returns<StudentAttemptRow[]>()
    : { data: [] };

  const attemptList = attempts ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <section className="rounded-2xl bg-navy p-6 text-white shadow-sm sm:p-8">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber">
              Student Dashboard
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">{ctx.profile.name}</h1>
            <p className="text-sm text-slate-300">
              {ctx.profile.roll ? `Roll/ID: ${ctx.profile.roll}` : "No Roll/ID set"}
              {ctx.profile.institution ? ` • ${ctx.profile.institution}` : ""}
            </p>
          </div>
        </section>

        <StudentJoinForm />

        {attemptList.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="text-base font-bold text-navy">Recent Exam Attempts</h2>
            <div className="divide-y divide-slate-100">
              {attemptList.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <span className="font-semibold text-slate-900 capitalize">
                      {a.status.replace("_", " ")}
                    </span>
                    <p className="text-xs text-slate-500">
                      Started {new Date(a.started_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={
                      a.status === "in_progress"
                        ? `/student/exams/${a.exam_id}/take`
                        : `/student/exams/${a.exam_id}/submitted`
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50"
                  >
                    <span>{a.status === "in_progress" ? "Resume Exam" : "View Status"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/student/results"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-navy"
          >
            <div className="mb-3 inline-flex rounded-lg bg-navy/10 p-2 text-navy">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h2 className="font-bold text-slate-900">My Results</h2>
            <p className="mt-1 text-sm text-slate-600">
              View your attempt history, released scores, and answer explanations.
            </p>
          </Link>

          <Link
            href="/student/practice"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-navy"
          >
            <div className="mb-3 inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="font-bold text-slate-900">Practice Search</h2>
            <p className="mt-1 text-sm text-slate-600">
              Search shared questions and closed exams where practice sharing is enabled.
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
