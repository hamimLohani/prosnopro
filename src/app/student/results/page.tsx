import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { StudentResultsList, type StudentHistoryItem } from "@/components/student-results-list";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";

export default async function StudentResultsPage() {
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
  if (ctx.profile.role !== "student") redirect("/teacher");

  const supabase = await createClient();
  const { data } = supabase ? await supabase.rpc("get_student_results_history") : { data: null };
  const payload = data as { ok?: boolean; items?: StudentHistoryItem[] } | null;
  const items = payload?.items ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">
              {t("আমার Result", "My Results")}
            </h1>
            <p className="text-sm text-slate-600">
              {t(
                "আপনার আগের Exam-গুলোর Score এবং সঠিক উত্তরের ব্যাখ্যা।",
                "Scores and answer explanations from your previous exams.",
              )}
            </p>
          </div>
          <Link href="/student" className="py-1 text-sm font-semibold text-navy hover:underline">
            {t("← Student Home-এ ফিরে যান", "← Back to Student Home")}
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-10 text-center space-y-3">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />
            <p className="text-base font-semibold text-slate-800">
              {t("এখনো কোনো Exam দেওয়া হয়নি", "No exams taken yet")}
            </p>
            <p className="text-sm text-slate-500">
              {t(
                "Dashboard থেকে Teacher Code এবং Exam Code দিয়ে একটি Exam-এ জয়েন করুন।",
                "Join an exam from your Dashboard using a Teacher Code and Exam Code.",
              )}
            </p>
          </div>
        ) : (
          <StudentResultsList items={items} />
        )}
      </main>
    </div>
  );
}
