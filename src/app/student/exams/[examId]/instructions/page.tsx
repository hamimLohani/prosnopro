import Link from "next/link";
import { redirect } from "next/navigation";
import { ExamInstructionsClient } from "@/components/exam-instructions-client";
import { Navbar } from "@/components/navbar";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";

interface InstructionsPageProps {
  params: Promise<{ examId: string }>;
}

export default async function ExamInstructionsPage({ params }: InstructionsPageProps) {
  const ctx = await getCurrentUserContext();
  if (!ctx.configured || !ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "student") redirect("/teacher");

  const { examId } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data } = await supabase.rpc("get_exam_instructions", { p_exam_id: examId });
  const result = data as {
    ok?: boolean;
    state?: "ready" | "resume" | "already_submitted";
    code?: string;
    opens_at?: string;
    exam?: Parameters<typeof ExamInstructionsClient>[0]["exam"];
  } | null;

  if (result?.ok && result.state === "already_submitted") {
    redirect(`/student/exams/${examId}/submitted`);
  }
  if (result?.ok && result.state === "resume") {
    redirect(`/student/exams/${examId}/take`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-start sm:items-center justify-center px-3 pt-4 pb-28 sm:px-4 sm:py-10">
        {result?.ok && result.exam ? (
          <ExamInstructionsClient exam={result.exam} />
        ) : (
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4">
            <h1 className="text-xl font-bold text-navy">Exam unavailable</h1>
            <p className="text-sm text-slate-600">
              {result?.code === "NOT_OPEN_YET" && result.opens_at
                ? `This scheduled exam opens at ${new Date(result.opens_at).toLocaleString()}.`
                : "This exam is closed or not currently available."}
            </p>
            <Link
              href="/student"
              className="inline-block rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong"
            >
              Back to Student Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
