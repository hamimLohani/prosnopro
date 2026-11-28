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
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">নতুন Exam তৈরি করুন</h1>
            <p className="text-sm text-slate-600">
              সময়, Marking নিয়ম ও Visibility সেট করুন, তারপর প্রশ্ন যোগ করুন।
            </p>
          </div>
          <Link href="/teacher" className="py-1 text-sm font-semibold text-navy hover:underline shrink-0">
            ← Dashboard-এ ফিরে যান
          </Link>
        </div>

        <TeacherExamForm mode="create" />
      </main>
    </div>
  );
}
