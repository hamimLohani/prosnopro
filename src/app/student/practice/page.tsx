import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import {
  StudentPracticeClient,
  type PracticeQuestionItem,
} from "@/components/student-practice-client";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";

export default async function StudentPracticePage() {
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
  if (ctx.profile.role !== "student") redirect("/teacher");

  const supabase = await createClient();
  const { data } = supabase
    ? await supabase.rpc("search_student_practice_questions", {
        p_keyword: "",
        p_subject: "",
        p_class: "",
        p_medium: "all",
        p_limit: 30,
        p_offset: 0,
      })
    : { data: null };

  const payload = data as {
    ok?: boolean;
    code?: string;
    active_exam_id?: string;
    items?: PracticeQuestionItem[];
  } | null;

  const blockedByExamId =
    payload?.code === "ATTEMPT_IN_PROGRESS" ? (payload.active_exam_id ?? null) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Practice Search</h1>
            <p className="text-sm text-slate-600">
              Practice with shared teacher questions and closed exams where practice sharing is on.
            </p>
          </div>
          <Link href="/student" className="text-sm font-semibold text-navy hover:underline">
            ← Back to Student Home
          </Link>
        </div>

        <StudentPracticeClient
          initialItems={payload?.items ?? []}
          blockedByExamId={blockedByExamId}
        />
      </main>
    </div>
  );
}
