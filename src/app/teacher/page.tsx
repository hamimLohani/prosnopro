import {
  BookOpen,
  Clock,
  HelpCircle,
  PlusCircle,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { TeacherCodeCopy } from "@/components/teacher-code-copy";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { Exam } from "@/lib/types";

export default async function TeacherDashboardPage() {
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
  if (ctx.profile.role !== "teacher") redirect("/student");

  const supabase = await createClient();
  const { data: exams } = supabase
    ? await supabase
        .from("exams")
        .select("*")
        .eq("teacher_id", ctx.userId)
        .order("created_at", { ascending: false })
        .returns<Exam[]>()
    : { data: [] };

  const examList = exams ?? [];
  const teacherCode = ctx.teacherProfile?.teacher_code ?? "UNSET";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 sm:space-y-6 px-3 py-4 sm:px-4 sm:py-8">
        <section className="rounded-2xl bg-navy p-4 sm:p-6 text-white shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber">
                Teacher Workspace
              </p>
              <h1 className="truncate text-lg font-bold sm:text-2xl">{ctx.profile.name}</h1>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 sm:px-4">
              <div>
                <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-300">
                  Teacher Code
                </span>
                <span className="font-mono text-lg font-bold tracking-widest text-amber">
                  {teacherCode}
                </span>
              </div>
              <TeacherCodeCopy code={teacherCode} />
            </div>
          </div>
        </section>

        <Link
          href="/teacher/exams/new"
          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong active:scale-[0.99]"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Create New Exam</span>
        </Link>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-navy">
              My Exams ({examList.length})
            </h2>
          </div>

          {examList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-2">
              <p className="text-base font-semibold text-slate-800">No exams yet</p>
              <p className="text-sm text-slate-500">
                Tap &ldquo;Create New Exam&rdquo; above to set up your first MCQ test.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {examList.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/teacher/exams/${exam.id}`}
                        className="text-base sm:text-lg font-bold text-slate-900 hover:text-navy hover:underline break-words"
                      >
                        {exam.name}
                      </Link>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          exam.status === "published"
                            ? "bg-emerald-100 text-emerald-800"
                            : exam.status === "closed"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {exam.status}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-navy">
                        {exam.code}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{exam.subject || "General"}</span>
                      <span>•</span>
                      <span>{exam.medium === "bn" ? "Bangla" : "English"}</span>
                      <span className="inline-flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {exam.question_count} Qs
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {exam.duration_minutes}m
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 shrink-0">
                    <Link
                      href={`/teacher/exams/${exam.id}/questions`}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Questions
                    </Link>
                    <Link
                      href={`/teacher/exams/${exam.id}`}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
                    >
                      Manage →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/teacher/bank"
            className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 transition hover:border-navy active:scale-[0.99]"
          >
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700 shrink-0">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-sm font-bold text-slate-900">Question Bank</span>
          </Link>

          <Link
            href="/teacher/settings"
            className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 transition hover:border-navy active:scale-[0.99]"
          >
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 shrink-0">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-sm font-bold text-slate-900">Settings &amp; AI</span>
          </Link>
        </section>
      </main>
    </div>
  );
}
