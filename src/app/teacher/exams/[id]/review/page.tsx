import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExamLifecycleActions } from "@/components/exam-lifecycle-actions";
import { MathText } from "@/components/math-text";
import { Navbar } from "@/components/navbar";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { optionLabel } from "@/lib/mcq";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { Exam, Question } from "@/lib/types";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamReviewPage({ params }: ReviewPageProps) {
  const [ctx, lang] = await Promise.all([getCurrentUserContext(), getServerLang()]);
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  if (!ctx.configured || !ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "teacher") redirect("/student");

  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", ctx.userId)
    .maybeSingle<Exam>();

  if (!exam) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", exam.id)
    .order("position", { ascending: true })
    .returns<Question[]>();

  const qList = questions ?? [];
  const warnings: string[] = [];

  if (qList.length === 0) {
    warnings.push(
      t(
        "এই Exam-এ এখনো কোনো প্রশ্ন যোগ করা হয়নি।",
        "No questions have been added to this exam yet.",
      ),
    );
  }
  qList.forEach((q, idx) => {
    if (q.options.length !== exam.options_per_question) {
      warnings.push(
        t(
          `প্রশ্ন ${idx + 1}-এ ${q.options.length}টি Option আছে (Exam সেটিংস অনুযায়ী ${exam.options_per_question}টি থাকা দরকার)।`,
          `Question ${idx + 1} has ${q.options.length} options (exam settings require ${exam.options_per_question}).`,
        ),
      );
    }
    if (q.correct_index < 0 || q.correct_index >= q.options.length) {
      warnings.push(
        t(
          `প্রশ্ন ${idx + 1}-এ সঠিক উত্তর নির্ধারণ করা নেই।`,
          `Question ${idx + 1} does not have a valid correct answer selected.`,
        ),
      );
    }
  });

  const canPublish = qList.length > 0 && warnings.length === 0;
  const totalMarks = qList.reduce((sum, q) => sum + Number(q.marks), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("Student Preview ও Review", "Student Preview & Review")}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-navy break-words">{exam.name}</h1>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 shrink-0">
            <Link
              href={`/teacher/exams/${exam.id}/questions`}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("← প্রশ্ন Edit করুন", "← Edit Questions")}
            </Link>
            <Link
              href={`/teacher/exams/${exam.id}`}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("Exam-এর বিস্তারিত", "Exam Details")}
            </Link>
          </div>
        </div>

        {/* Validation Checklist (show issues at top if any) */}
        {warnings.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <span>
                {t("Publish করার আগে এই সমস্যাগুলো ঠিক করুন", "Fix these issues before publishing")}
              </span>
            </div>
            <ul className="list-disc pl-5 text-sm text-amber-900 space-y-1">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Student View Preview */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">{exam.name}</h2>
              <p className="text-xs text-slate-500">
                {exam.subject || "General"} •{" "}
                {exam.medium === "bn" ? t("বাংলা", "Bangla") : "English"} •{" "}
                {t(`${exam.duration_minutes} মিনিট`, `${exam.duration_minutes} min`)}
                {exam.negative_marking
                  ? t(
                      ` • প্রতি ভুল উত্তরে -${exam.negative_value}`,
                      ` • -${exam.negative_value} per wrong answer`,
                    )
                  : ""}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {t("শুধু Preview", "Preview Only")}
            </span>
          </div>

          <div className="space-y-5 sm:space-y-6">
            {qList.map((q, idx) => (
              <div key={q.id} className="space-y-3 border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 flex-1 text-[15px] sm:text-sm font-semibold text-slate-900 break-words">
                    {idx + 1}. <MathText text={q.text} />
                  </p>
                  <span className="shrink-0 text-xs text-slate-500">[{q.marks}]</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`rounded-lg border px-3 py-2.5 sm:py-2 text-sm break-words ${
                        optIdx === q.correct_index
                          ? "border-emerald-300 bg-emerald-50/70 text-emerald-950"
                          : "border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="font-semibold mr-1.5">
                        {optionLabel(optIdx, exam.medium)})
                      </span>
                      <MathText text={opt} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ready to Publish (placed after all questions so the teacher reviews everything first) */}
        {warnings.length === 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
            <div className="flex items-center gap-2.5 text-emerald-950">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">{t("Publish করার জন্য প্রস্তুত", "Ready to Publish")}</p>
                <p className="text-xs text-emerald-800">
                  {t(
                    `${qList.length}টি প্রশ্ন • মোট ${totalMarks} নম্বর • ${exam.duration_minutes} মিনিট`,
                    `${qList.length} questions • ${totalMarks} total marks • ${exam.duration_minutes} min`,
                  )}
                </p>
              </div>
            </div>

            <ExamLifecycleActions
              examId={exam.id}
              status={exam.status}
              canPublish={canPublish}
              forceCloseDefault={exam.force_close_active}
            />
          </div>
        )}
      </main>
    </div>
  );
}
