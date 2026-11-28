import { ArrowRight, ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { StudentJoinForm } from "@/components/student-join-form";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { formatAttemptStatus } from "@/lib/mcq";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { AttemptStatus } from "@/lib/types";

interface StudentAttemptRow {
  id: string;
  exam_id: string;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  exams: { name: string; subject: string } | null;
}

interface StudentDashboardPageProps {
  searchParams: Promise<{ t?: string; e?: string }>;
}

export default async function StudentDashboardPage({ searchParams }: StudentDashboardPageProps) {
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

  const sp = await searchParams;

  if (!ctx.userId) {
    const qs = new URLSearchParams();
    if (sp.t) qs.set("t", sp.t);
    if (sp.e) qs.set("e", sp.e);
    const nextPath = qs.toString() ? `/student?${qs.toString()}` : "/student";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "student") redirect("/teacher");

  const supabase = await createClient();
  if (supabase) {
    await supabase.rpc("finalize_expired_attempts");
  }

  const { data: attempts } = supabase
    ? await supabase
        .from("attempts")
        .select("id, exam_id, status, started_at, submitted_at, exams(name, subject)")
        .eq("student_id", ctx.userId)
        .order("started_at", { ascending: false })
        .limit(10)
        .returns<StudentAttemptRow[]>()
    : { data: [] };

  const attemptList = attempts ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 sm:space-y-6 px-3 py-4 sm:px-4 sm:py-8">
        <section className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-navy px-4 py-3.5 text-white shadow-sm sm:p-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-2xl">
              {t(`স্বাগতম, ${ctx.profile.name}`, `Welcome, ${ctx.profile.name}`)}
            </h1>
            <p className="text-xs text-slate-300">
              {ctx.profile.roll ? `Roll/ID: ${ctx.profile.roll}` : t("Student পোর্টাল", "Student Portal")}
              {ctx.profile.institution ? ` • ${ctx.profile.institution}` : ""}
            </p>
          </div>
          <Link
            href="/student/settings"
            className="inline-flex min-h-[38px] items-center rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 shrink-0"
          >
            {t("প্রোফাইল Edit", "Edit Profile")}
          </Link>
        </section>

        <StudentJoinForm initialTeacherCode={sp.t ?? ""} initialExamCode={sp.e ?? ""} />

        {attemptList.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-xs sm:text-sm text-slate-600 space-y-1.5">
            <p className="font-bold text-navy">
              {t("নতুন Student? জেনে রাখো:", "New Student? Good to know:")}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                {t(
                  "Code দিলেই সাথে সাথে টাইমার শুরু হবে না — আগে পরীক্ষার তথ্য ও নিয়ম দেখতে পাবেন।",
                  "Entering a code does not start the timer right away — you will see exam details first.",
                )}
              </li>
              <li>
                {t(
                  "পরীক্ষা চলাকালে নেটওয়ার্ক চলে গেলেও আপনার উত্তর ফোনে Save থাকবে।",
                  "Even if your connection drops during an exam, your answers stay saved on your phone.",
                )}
              </li>
            </ul>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-3">
            <h2 className="text-base font-bold text-navy">
              {t("সাম্প্রতিক Exam", "Recent Exams")}
            </h2>
            <div className="divide-y divide-slate-100">
              {attemptList.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2.5 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-semibold text-slate-900 break-words">
                      {a.exams?.name ?? t("অনলাইন Exam", "Online Exam")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.exams?.subject ? `${a.exams.subject} • ` : ""}
                      <span>{formatAttemptStatus(a.status, lang)}</span> •{" "}
                      {new Date(a.started_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={
                      a.status === "in_progress"
                        ? `/student/exams/${a.exam_id}/take`
                        : `/student/exams/${a.exam_id}/submitted`
                    }
                    className={`inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                      a.status === "in_progress"
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-slate-300 text-navy hover:bg-slate-50"
                    }`}
                  >
                    <span>
                      {a.status === "in_progress"
                        ? t("Exam চালিয়ে যান", "Resume Exam")
                        : t("অবস্থা দেখুন", "View Status")}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 sm:gap-4">
          <Link
            href="/student/results"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-navy active:scale-[0.99]"
          >
            <div className="rounded-lg bg-navy/10 p-2 text-navy shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base text-slate-900">
                {t("আমার Result", "My Results")}
              </h2>
              <p className="hidden sm:block text-xs text-slate-500">
                {t("Score ও ব্যাখ্যা", "Scores & explanations")}
              </p>
            </div>
          </Link>

          <Link
            href="/student/practice"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-navy active:scale-[0.99]"
          >
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 shrink-0">
              <Search className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base text-slate-900">Practice</h2>
              <p className="hidden sm:block text-xs text-slate-500">
                {t("আগের ও Shared প্রশ্ন", "Past & shared questions")}
              </p>
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
}
