import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

export default async function SignupChooserPage() {
  const lang = await getServerLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-navy">
            {t("আপনার Account-এর ধরন বাছাই করুন", "Choose your Account Type")}
          </h1>
          <p className="text-sm text-slate-600">
            {t(
              "শিক্ষক ও শিক্ষার্থীদের জন্য সম্পূর্ণ ফ্রি। Google দিয়ে কয়েক সেকেন্ডেই Sign in করুন।",
              "Free for teachers and students. Sign in with Google in seconds.",
            )}
          </p>
        </div>

        <div className="grid w-full gap-5 sm:grid-cols-2">
          <Link
            href="/signup/teacher"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-navy hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-navy/10 p-3 text-navy">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Teacher Account</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              {t(
                "আপনার ইউনিক Teacher Code সেট করুন, বাংলা বা English-এ টাইমড MCQ Exam তৈরি করুন, Live Monitor করুন এবং Result Export করুন।",
                "Set your unique Teacher Code, create timed Bangla or English MCQ exams, monitor live, and export results.",
              )}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy group-hover:translate-x-0.5 transition">
              {t("Teacher হিসেবে Sign up", "Sign up as Teacher")} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/signup/student"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-amber-100 p-3 text-amber-700">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Student Account</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              {t(
                "Teacher Code ও Exam Code দিয়ে Exam-এ জয়েন করুন, Score ও ব্যাখ্যা দেখুন এবং আগের প্রশ্ন Practice করুন।",
                "Join exams with Teacher Code & Exam Code, view scores & explanations, and practice past questions.",
              )}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy group-hover:translate-x-0.5 transition">
              {t("Student হিসেবে Sign up", "Sign up as Student")} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-600">
          {t("আগে থেকেই Account আছে?", "Already have an account?")}{" "}
          <Link href="/login" className="font-semibold text-navy hover:underline">
            {t("Sign in করুন", "Sign in")}
          </Link>
        </p>
      </main>
    </div>
  );
}
