import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { TeacherExamForm } from "@/components/teacher-exam-form";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { Exam } from "@/lib/types";

interface EditExamPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExamPage({ params }: EditExamPageProps) {
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

  const { count: attemptCount } = await supabase
    .from("attempts")
    .select("id", { head: true, count: "exact" })
    .eq("exam_id", exam.id);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-navy">
              {t("Exam Settings Edit করুন", "Edit Exam Settings")}
            </h1>
            <p className="truncate text-sm text-slate-600">{exam.name}</p>
          </div>
          <Link
            href={`/teacher/exams/${exam.id}`}
            className="py-1 text-sm font-semibold text-navy hover:underline shrink-0"
          >
            {t("← Exam-এ ফিরে যান", "← Back to Exam")}
          </Link>
        </div>

        <TeacherExamForm
          mode="edit"
          exam={exam}
          hasAttempts={exam.status !== "closed" && (attemptCount ?? 0) > 0}
        />
      </main>
    </div>
  );
}
