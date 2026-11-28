import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { getCurrentUserContext } from "@/lib/supabase/server";

export default async function HomePage() {
  const [ctx, lang] = await Promise.all([getCurrentUserContext(), getServerLang()]);
  const t = (bn: string, en: string) => pickText(lang, bn, en);
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
                <span>{t("বাংলা & English MCQ Exam", "School, College & University MCQ Exam")}</span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-4xl">
                {t(
                  "মোবাইলের জন্য তৈরি সহজ ও দ্রুত অনলাইন Exam।",
                  "Fast, mobile-first online MCQ exams for schools & universities.",
                )}
              </h1>

              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                {t(
                  "শিক্ষকরা একটি Code দিয়েই টাইমড Exam প্রকাশ করতে পারেন। শিক্ষার্থীরা কয়েক সেকেন্ডেই জয়েন করে, নেটওয়ার্ক চলে গেলেও উত্তর অফলাইনে Save থাকে, এবং যেকোনো সময় Result দেখতে পারে।",
                  "Teachers publish timed MCQ exams with a single code. Students join in seconds, answers stay saved offline on weak networks, and results are available anytime.",
                )}
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-2">
                {ctx.userId ? (
                  <Link
                    href={dashboardHref}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong"
                  >
                    <span>{t("Dashboard খুলুন", "Open Dashboard")}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup/student"
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong"
                    >
                      <span>{t("Student হিসেবে জয়েন করুন", "Join as Student")}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/signup/teacher"
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <span>{t("Teacher Account খুলুন", "Create Teacher Account")}</span>
                    </Link>
                  </>
                )}
              </div>

              {!ctx.userId && (
                <p className="text-xs text-slate-500 pt-1">
                  {t("আগে থেকেই Account আছে?", "Already have an account?")}{" "}
                  <Link href="/login" className="font-semibold text-navy hover:underline">
                    {t("Sign in করুন", "Sign in")}
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
              <h2 className="text-base font-bold text-slate-900">
                {t("Student-দের জন্য", "For Students")}
              </h2>
              <ol className="list-decimal pl-4 space-y-1 text-sm text-slate-600">
                <li>{t("Google বা Email দিয়ে একবার Sign in করুন।", "Sign in once with Google or Email.")}</li>
                <li>{t("Teacher Code এবং Exam Code দিয়ে জয়েন করুন।", "Join using your Teacher Code and Exam Code.")}</li>
                <li>{t("উত্তর ট্যাপ করুন — দুর্বল 3G/4G নেটওয়ার্কেও Offline Save থাকবে।", "Tap answers — saved offline even on weak 3G/4G.")}</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5">
              <div className="inline-flex rounded-lg bg-navy/10 p-2 text-navy">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {t("Teacher-দের জন্য", "For Teachers")}
              </h2>
              <ol className="list-decimal pl-4 space-y-1 text-sm text-slate-600">
                <li>{t("Exam তৈরি করুন এবং Manual, AI বা PDF থেকে প্রশ্ন যোগ করুন।", "Create exams and add questions via Manual, AI, or PDF.")}</li>
                <li>{t("Publish করে আপনার Teacher Code + Exam Code শেয়ার করুন।", "Publish and share your Teacher Code + Exam Code.")}</li>
                <li>{t("Live Monitor করুন এবং Excel, CSV বা Word ফরম্যাটে Result Export করুন।", "Monitor live and export results in Excel, CSV, or Word.")}</li>
              </ol>
            </div>
          </div>

          {!ctx.userId && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3">
              <h2 className="text-base font-bold text-navy">
                {t("ProsnoPro সম্পর্কে (About)", "About ProsnoPro")}
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {t(
                  "ProsnoPro (প্রশ্নপ্রো) বাংলাদেশি স্কুল, কলেজ ও বিশ্ববিদ্যালয়ের শিক্ষক ও শিক্ষার্থীদের জন্য তৈরি একটি মোবাইল-বান্ধব বাংলা ও English অনলাইন MCQ পরীক্ষা প্ল্যাটফর্ম। দুর্বল 3G/4G নেটওয়ার্কেও উত্তর ফোনে Save থাকে, গণিত ও বিজ্ঞানের সূত্র (KaTeX) সুন্দরভাবে দেখায় এবং শিক্ষকরা নিজস্ব AI Key দিয়েও দ্রুত প্রশ্ন তৈরি করতে পারেন।",
                  "ProsnoPro is a mobile-first Bangla & English online MCQ exam platform built for school, college, and university teachers and students. Answers stay saved offline on weak networks, math/science equations render cleanly with KaTeX, and teachers can generate questions with their own AI key.",
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link
                  href="/privacy"
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <span>Privacy Notice</span>
                </Link>
                <Link
                  href="/about"
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <span>{t("বিস্তারিত জানুন (About)", "Learn More (About)")}</span>
                </Link>
              </div>
            </div>
          )}
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
