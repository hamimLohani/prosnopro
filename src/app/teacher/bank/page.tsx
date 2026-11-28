import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { QuestionBankManager } from "@/components/question-bank-manager";
import { SetupBanner } from "@/components/setup-banner";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { QuestionBankItem } from "@/lib/types";

export default async function TeacherBankPage() {
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
  const [{ data: items }, { data: aiStatusRaw }] = supabase
    ? await Promise.all([
        supabase
          .from("question_bank")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000)
          .returns<QuestionBankItem[]>(),
        supabase.rpc("get_teacher_ai_status"),
      ])
    : [{ data: [] }, { data: null }];

  const aiStatus = (aiStatusRaw ?? {}) as { ai_provider?: string | null; has_key?: boolean };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">Question Bank</h1>
            <p className="text-sm text-slate-600">
              {t(
                "আপনার সংরক্ষিত প্রশ্ন পরিচালনা করুন এবং অন্যান্য Teacher-দের শেয়ার করা প্রশ্ন দেখুন।",
                "Manage your saved questions and browse questions shared by other teachers.",
              )}
            </p>
          </div>
          <Link href="/teacher" className="py-1 text-sm font-semibold text-navy hover:underline shrink-0">
            {t("← Dashboard-এ ফিরে যান", "← Back to Dashboard")}
          </Link>
        </div>

        <QuestionBankManager
          teacherId={ctx.userId}
          initialItems={items ?? []}
          hasAiKey={Boolean(aiStatus.has_key)}
          aiProvider={aiStatus.ai_provider ?? null}
        />
      </main>
    </div>
  );
}
