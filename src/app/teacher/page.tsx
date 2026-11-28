import {
  BookOpen,
  PlusCircle,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { TeacherCodeCopy } from "@/components/teacher-code-copy";
import { TeacherExamList } from "@/components/teacher-exam-list";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { Exam } from "@/lib/types";

export default async function TeacherDashboardPage() {
  const [ctx, lang] = await Promise.all([getCurrentUserContext(), getServerLang()]);
  const t = (bn: string, en: string) => pickText(lang, bn, en);

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
          <span>{t("নতুন Exam তৈরি করুন", "Create New Exam")}</span>
        </Link>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-navy">
              {t(`আমার Exam (${examList.length})`, `My Exams (${examList.length})`)}
            </h2>
          </div>

          {examList.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-navy">
                  {t("নতুন Teacher? ৩ ধাপে প্রথম Exam শুরু করুন", "New Teacher? Start your first exam in 3 steps")}
                </h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
                  <li>
                    {t("উপরের", "Tap")}{" "}
                    <strong className="text-slate-800">
                      {t("নতুন Exam তৈরি করুন", "Create New Exam")}
                    </strong>{" "}
                    {t(
                      "বাটনে ট্যাপ করে নাম, Class ও সময় দিন।",
                      "above and set the title, Class/Level, and duration.",
                    )}
                  </li>
                  <li>
                    <strong className="text-slate-800">Manual</strong>,{" "}
                    <strong className="text-slate-800">Bulk Paste</strong>,{" "}
                    {t("অথবা", "or")}{" "}
                    <Link href="/teacher/settings#ai-key" className="font-semibold text-navy underline">
                      {t("Settings-এ ফ্রি Gemini/Groq Key", "add a free Gemini/Groq key in Settings")}
                    </Link>{" "}
                    {t("যোগ করে AI/PDF দিয়ে প্রশ্ন তৈরি করুন।", "to generate questions via AI/PDF.")}
                  </li>
                  <li>
                    Exam <strong className="text-slate-800">Publish</strong>{" "}
                    {t("করে আপনার", "and share your")}{" "}
                    <span className="font-mono font-semibold text-navy">{teacherCode}</span>{" "}
                    {t("ও Exam Code Student-দের সাথে শেয়ার করুন।", "& Exam Code with students.")}
                  </li>
                </ol>
              </div>
              <TeacherExamList exams={examList} />
            </div>
          ) : (
            <TeacherExamList exams={examList} />
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
