import {
  BookOpen,
  Clock,
  FileSpreadsheet,
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

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <section className="rounded-2xl bg-navy p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber">
                Teacher Workspace
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl">Welcome, {ctx.profile.name}</h1>
              <p className="text-sm text-slate-300">
                Share your Teacher Code along with an Exam Code so students can enter your exams.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 sm:items-end">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">
                Your Teacher Code
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold tracking-widest text-amber">
                  {teacherCode}
                </span>
                <TeacherCodeCopy code={teacherCode} />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-navy">My Exams</h2>
              <p className="text-sm text-slate-600">
                Create exams, add questions, preview, and publish codes.
              </p>
            </div>
            <Link
              href="/teacher/exams/new"
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Exam</span>
            </Link>
          </div>

          {examList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
              <p className="text-base font-semibold text-slate-800">No exams yet</p>
              <p className="text-sm text-slate-500">
                Create your first Bangla or English MCQ exam to get an Exam Code.
              </p>
              <div>
                <Link
                  href="/teacher/exams/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Create your first exam</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {examList.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/teacher/exams/${exam.id}`}
                        className="text-lg font-bold text-slate-900 hover:text-navy hover:underline"
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

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span>{exam.subject || "General"}</span>
                      <span>{exam.medium === "bn" ? "Bangla" : "English"}</span>
                      <span className="inline-flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {exam.question_count} questions
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {exam.duration_minutes} min
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/teacher/exams/${exam.id}/questions`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Questions
                    </Link>
                    <Link
                      href={`/teacher/exams/${exam.id}/review`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Review
                    </Link>
                    <Link
                      href={`/teacher/exams/${exam.id}`}
                      className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-strong"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/teacher/bank"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-navy"
          >
            <div className="mb-3 inline-flex rounded-lg bg-amber-100 p-2 text-amber-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900">Question Bank</h3>
            <p className="mt-1 text-sm text-slate-600">
              Search your saved questions and shared questions, or reuse them in any exam.
            </p>
          </Link>

          <Link
            href="/teacher/settings"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-navy"
          >
            <div className="mb-3 inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <Settings className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900">Teacher Settings</h3>
            <p className="mt-1 text-sm text-slate-600">
              Manage your profile, Teacher Code, and AI provider settings.
            </p>
          </Link>

          <Link
            href="/tools/bangla-spike"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-navy"
          >
            <div className="mb-3 inline-flex rounded-lg bg-navy/10 p-2 text-navy">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900">Bangla PDF Spike</h3>
            <p className="mt-1 text-sm text-slate-600">
              Test Bangla print-to-PDF shaping and browser-side `pdf.js` inspection.
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
