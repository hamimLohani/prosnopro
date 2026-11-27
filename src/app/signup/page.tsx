import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function SignupChooserPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-navy">আপনার Account-এর ধরন বাছাই করুন</h1>
          <p className="text-sm text-slate-600">
            শিক্ষক ও শিক্ষার্থীদের জন্য সম্পূর্ণ ফ্রি। Google দিয়ে কয়েক সেকেন্ডেই Sign in করুন।
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
              আপনার ইউনিক Teacher Code সেট করুন, বাংলা বা English-এ টাইমড MCQ Exam তৈরি করুন,
              Live Monitor করুন এবং Result Export করুন।
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy group-hover:translate-x-0.5 transition">
              Teacher হিসেবে Sign up <ArrowRight className="h-4 w-4" />
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
              Teacher Code ও Exam Code দিয়ে Exam-এ জয়েন করুন, Score ও ব্যাখ্যা দেখুন এবং আগের প্রশ্ন
              Practice করুন।
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy group-hover:translate-x-0.5 transition">
              Student হিসেবে Sign up <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-600">
          আগে থেকেই Account আছে?{" "}
          <Link href="/login" className="font-semibold text-navy hover:underline">
            Sign in করুন
          </Link>
        </p>
      </main>
    </div>
  );
}
