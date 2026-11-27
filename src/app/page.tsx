import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getCurrentUserContext } from "@/lib/supabase/server";

export default async function HomePage() {
  const ctx = await getCurrentUserContext();
  const dashboardHref =
    ctx.profile?.role === "teacher"
      ? "/teacher"
      : ctx.profile?.role === "student"
        ? "/student"
        : "/onboarding";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />

      <main className="flex-1">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
            <div className="max-w-xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                <span>বাংলা &amp; English MCQ Exams</span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-4xl">
                Simple, fast online exams made for mobile phones.
              </h1>

              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                Teachers publish timed exams with one code. Students join in seconds, keep answers
                saved offline if the network drops, and check results anytime.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-2">
                {ctx.userId ? (
                  <Link
                    href={dashboardHref}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong"
                  >
                    <span>Open your dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup/student"
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong"
                    >
                      <span>Join as Student</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/signup/teacher"
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <span>Create Teacher Account</span>
                    </Link>
                  </>
                )}
              </div>

              {!ctx.userId && (
                <p className="text-xs text-slate-500 pt-1">
                  Already registered?{" "}
                  <Link href="/login" className="font-semibold text-navy hover:underline">
                    Sign in here
                  </Link>
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5">
              <div className="inline-flex rounded-lg bg-amber-100 p-2 text-amber-700">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">For Students</h2>
              <ol className="list-decimal pl-4 space-y-1 text-sm text-slate-600">
                <li>Sign in once with Google or email.</li>
                <li>Enter the Teacher Code and Exam Code.</li>
                <li>Tap answers — saved offline even on weak 3G/4G.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5">
              <div className="inline-flex rounded-lg bg-navy/10 p-2 text-navy">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">For Teachers</h2>
              <ol className="list-decimal pl-4 space-y-1 text-sm text-slate-600">
                <li>Create an exam and add questions (manual, AI, or PDF).</li>
                <li>Publish and share your Teacher Code + Exam Code.</li>
                <li>Monitor live entries and export results in Excel, CSV, or Word.</li>
              </ol>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-xs text-slate-500">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4">
          <span>ProsnoPro • Online Exam Platform</span>
          <Link href="/privacy" className="hover:text-slate-800">
            Privacy Notice
          </Link>
        </div>
      </footer>
    </div>
  );
}
