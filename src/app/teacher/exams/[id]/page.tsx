import { BarChart3, Clock, Edit3, Eye, HelpCircle, Printer, Radio, Settings2, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExamAttemptsPreview, type ExamAttemptPreviewRow } from "@/components/exam-attempts-preview";
import { ExamLifecycleActions } from "@/components/exam-lifecycle-actions";
import { Navbar } from "@/components/navbar";
import { TeacherCodeCopy } from "@/components/teacher-code-copy";
import { ExamStatusBadge } from "@/components/ui/primitives";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { Exam } from "@/lib/types";

interface ExamDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamDetailPage({ params }: ExamDetailPageProps) {
  const [ctx, lang] = await Promise.all([getCurrentUserContext(), getServerLang()]);
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  if (!ctx.configured || !ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "teacher") redirect("/student");

  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  // Lazy finalization so expired attempts update cleanly before rendering teacher results
  await supabase.rpc("finalize_expired_attempts");

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", ctx.userId)
    .maybeSingle<Exam>();

  if (!exam) notFound();

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, student_name, student_roll, status, started_at, submitted_at, score, total_marks")
    .eq("exam_id", exam.id)
    .order("started_at", { ascending: false })
    .returns<ExamAttemptPreviewRow[]>();

  const attemptList = attempts ?? [];
  const teacherCode = ctx.teacherProfile?.teacher_code ?? "";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <ExamStatusBadge status={exam.status} lang={lang} />
              <span className="text-xs text-slate-500">
                {exam.class ? `${exam.class} • ` : ""}
                {exam.subject || "General"} •{" "}
                {exam.medium === "bn" ? t("বাংলা", "Bangla") : "English"}
              </span>
            </div>
            <h1 className="text-xl font-bold text-navy sm:text-3xl break-words">{exam.name}</h1>
          </div>

          <Link href="/teacher" className="py-1 text-sm font-semibold text-navy hover:underline shrink-0">
            {t("← Dashboard-এ ফিরে যান", "← Back to Dashboard")}
          </Link>
        </div>

        {/* Guided Next-Step & Join Codes Banner */}
        <section className="rounded-2xl bg-navy p-4 sm:p-6 text-white flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber">
              {exam.status === "published"
                ? t("Live • Join Code শেয়ার করুন", "Live • Share Join Codes")
                : exam.status === "draft"
                  ? exam.question_count === 0
                    ? t("ধাপ ১ • প্রশ্ন যোগ করুন", "Step 1 • Add Questions")
                    : t("ধাপ ২ • Publish করার জন্য প্রস্তুত", "Step 2 • Ready to Publish")
                  : t("Closed Exam", "Closed Exam")}
            </p>
            <p className="text-sm text-slate-200">
              {exam.status === "published"
                ? t(
                    "Exam এখন Live আছে। Student-দের সাথে দুটি Code শেয়ার করুন:",
                    "This exam is live. Share both codes with your students:",
                  )
                : exam.status === "draft"
                  ? exam.question_count === 0
                    ? t(
                        "Publish করার আগে অন্তত একটি প্রশ্ন যোগ করুন।",
                        "Add at least one question before publishing.",
                      )
                    : t(
                        "প্রশ্নগুলো Preview করুন অথবা নিচে Publish করুন যাতে Student-রা জয়েন করতে পারে।",
                        "Preview your questions or publish below so students can join.",
                      )
                  : t(
                      "নতুন এন্ট্রির জন্য Exam বন্ধ আছে। নিচে Result দেখুন বা Export করুন।",
                      "This exam is closed to new entries. View or export results below.",
                    )}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5">
              <span className="block text-[10px] uppercase text-slate-300">Teacher Code</span>
              <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-white">
                {teacherCode}
              </span>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5">
              <span className="block text-[10px] uppercase text-slate-300">Exam Code</span>
              <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-amber">
                {exam.code}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 [&>button]:w-full sm:[&>button]:w-auto">
              <TeacherCodeCopy
                code={t(
                  `📝 ProsnoPro Online Exam\nExam: ${exam.name}\nসময়: ${exam.duration_minutes} মিনিট\nলিংক: __STUDENT_URL__\nTeacher Code: ${teacherCode}\nExam Code: ${exam.code}`,
                  `📝 ProsnoPro Online Exam\nExam: ${exam.name}\nDuration: ${exam.duration_minutes} min\nLink: __STUDENT_URL__\nTeacher Code: ${teacherCode}\nExam Code: ${exam.code}`,
                )}
                label={t("Invite Message Copy করুন", "Copy Invite Message")}
                copiedLabel={t("Invite Copy হয়েছে", "Invite Copied")}
                includeStudentUrl
                studentPath={`/student?t=${encodeURIComponent(teacherCode)}&e=${encodeURIComponent(exam.code)}`}
              />
            </div>
          </div>
        </section>

        {/* Actions & Navigation */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
            <Link
              href={`/teacher/exams/${exam.id}/questions`}
              className="inline-flex min-h-[44px] items-center justify-center sm:justify-start gap-1.5 rounded-xl bg-navy px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-navy-strong"
            >
              <Edit3 className="h-4 w-4 shrink-0" />
              <span>{t(`প্রশ্নসমূহ (${exam.question_count})`, `Questions (${exam.question_count})`)}</span>
            </Link>
            <Link
              href={`/teacher/exams/${exam.id}/review`}
              className="inline-flex min-h-[44px] items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Eye className="h-4 w-4 shrink-0" />
              <span>{t("প্রিভিউ", "Preview")}</span>
            </Link>
            <Link
              href={`/teacher/exams/${exam.id}/monitor`}
              className="inline-flex min-h-[44px] items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Radio className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{t("লাইভ মনিটর", "Monitor")}</span>
            </Link>
            <Link
              href={`/teacher/exams/${exam.id}/results`}
              className="inline-flex min-h-[44px] items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <BarChart3 className="h-4 w-4 shrink-0 text-navy" />
              <span>{t("Result ও Analytics", "Results & Analytics")}</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <Link
              href={`/teacher/exams/${exam.id}/edit`}
              className="inline-flex min-h-[40px] items-center justify-center sm:justify-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              <span>{t("Exam সেটিংস", "Exam Settings")}</span>
            </Link>
            <Link
              href={`/teacher/exams/${exam.id}/print?mode=paper`}
              className="inline-flex min-h-[40px] items-center justify-center sm:justify-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              <span>{t("Print ও Export", "Print & Export")}</span>
            </Link>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <ExamLifecycleActions
              examId={exam.id}
              status={exam.status}
              canPublish={exam.question_count > 0}
              forceCloseDefault={exam.force_close_active}
            />
          </div>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <HelpCircle className="h-5 w-5 text-navy shrink-0" />
            <div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {t("মোট প্রশ্ন", "Total Questions")}
              </p>
              <p className="text-lg sm:text-xl font-bold text-slate-900">{exam.question_count}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-[11px] sm:text-xs text-slate-500">{t("সময়", "Duration")}</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900">
                {t(`${exam.duration_minutes} মি.`, `${exam.duration_minutes} min`)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <Users className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {t("অংশগ্রহণ", "Participants")}
              </p>
              <p className="text-lg sm:text-xl font-bold text-slate-900">{attemptList.length}</p>
            </div>
          </div>
        </section>

        {/* Attempts List Preview */}
        <ExamAttemptsPreview examId={exam.id} attempts={attemptList} />
      </main>
    </div>
  );
}
