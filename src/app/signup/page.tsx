import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function SignupChooserPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-navy">Choose your account type</h1>
          <p className="text-sm text-slate-600">
            Free forever for teachers and students. Sign in with Google in seconds.
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
            <h2 className="text-xl font-bold text-slate-900">Teacher account</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Choose your unique Teacher Code, build timed Bangla or English MCQ exams, monitor entries,
              and export results.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy group-hover:translate-x-0.5 transition">
              Sign up as Teacher <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/signup/student"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-amber-100 p-3 text-amber-700">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Student account</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Join exams using a Teacher Code and Exam Code, view your scores and explanations, and
              practice past questions.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy group-hover:translate-x-0.5 transition">
              Sign up as Student <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-navy hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
