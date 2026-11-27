import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { TeacherExamForm } from "@/components/teacher-exam-form";
import { getCurrentUserContext } from "@/lib/supabase/server";

export default async function NewExamPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx.configured || !ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "teacher") redirect("/student");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Create New Exam</h1>
            <p className="text-sm text-slate-600">
              Configure timing, marking rules, and visibility, then add questions.
            </p>
          </div>
          <Link href="/teacher" className="text-sm font-semibold text-navy hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <TeacherExamForm mode="create" />
      </main>
    </div>
  );
}
