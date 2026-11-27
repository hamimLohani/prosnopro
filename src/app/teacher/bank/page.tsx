import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { QuestionBankManager } from "@/components/question-bank-manager";
import { SetupBanner } from "@/components/setup-banner";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { QuestionBankItem } from "@/lib/types";

export default async function TeacherBankPage() {
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
  const { data: items } = supabase
    ? await supabase
        .from("question_bank")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
        .returns<QuestionBankItem[]>()
    : { data: [] };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">Question Bank</h1>
            <p className="text-sm text-slate-600">
              Manage your saved questions and browse questions shared by other teachers.
            </p>
          </div>
          <Link href="/teacher" className="py-1 text-sm font-semibold text-navy hover:underline shrink-0">
            ← Back to Dashboard
          </Link>
        </div>

        <QuestionBankManager teacherId={ctx.userId} initialItems={items ?? []} />
      </main>
    </div>
  );
}
