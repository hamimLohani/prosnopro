import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { TeacherQuestionEditor } from "@/components/teacher-question-editor";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { Exam, Question, QuestionBankItem } from "@/lib/types";

interface QuestionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamQuestionsPage({ params }: QuestionsPageProps) {
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

  const [{ data: questions }, { count: attemptCount }, { data: aiStatusRaw }, { data: bankItems }] =
    await Promise.all([
      supabase
        .from("questions")
        .select("*")
        .eq("exam_id", exam.id)
        .order("position", { ascending: true })
        .returns<Question[]>(),
      supabase
        .from("attempts")
        .select("id", { head: true, count: "exact" })
        .eq("exam_id", exam.id),
      supabase.rpc("get_teacher_ai_status"),
      supabase
        .from("question_bank")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000)
        .returns<QuestionBankItem[]>(),
    ]);

  const aiStatus = (aiStatusRaw ?? {}) as { ai_provider?: string | null; has_key?: boolean };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Question Editor • {exam.code}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-navy break-words">{exam.name}</h1>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 shrink-0">
            <Link
              href={`/teacher/exams/${exam.id}`}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("Exam-এর বিস্তারিত", "Exam Details")}
            </Link>
            <Link
              href={`/teacher/exams/${exam.id}/review`}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-navy px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-navy-strong"
            >
              {t("Review ও Publish →", "Review & Publish →")}
            </Link>
          </div>
        </div>

        <TeacherQuestionEditor
          exam={exam}
          initialQuestions={questions ?? []}
          initialBankItems={bankItems ?? []}
          hasAttempts={(attemptCount ?? 0) > 0}
          hasAiKey={Boolean(aiStatus.has_key)}
          aiProvider={aiStatus.ai_provider ?? null}
        />
      </main>
    </div>
  );
}
