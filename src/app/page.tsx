import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
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
          <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
            <div className="max-w-2xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                <span>বাংলা &amp; English MCQ Platform</span>
                <span className="text-amber-500">•</span>
                <span>Zero-Cost Edition</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-5xl">
                Fair, fast online exams that work even on weak mobile networks.
              </h1>

              <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
                Teachers publish timed exams with one Teacher Code and Exam Code. Students join in
                seconds, keep answers backed up offline if 3G drops, and practice with past
                questions.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {ctx.userId ? (
                  <Link
                    href={dashboardHref}
                    className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong"
                  >
                    <span>Open your dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup/teacher"
                      className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong"
                    >
                      <span>Create Teacher Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/signup/student"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <span>Join as Student</span>
                    </Link>
                  </>
                )}

                <Link
                  href="/tools/bangla-spike"
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  <FileText className="h-4 w-4" />
                  <span>Bangla Print &amp; PDF Spike</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 inline-flex rounded-lg bg-navy/10 p-2.5 text-navy">
                <Wifi className="h-5 w-5" />
              </div>
              <h2 className="font-bold text-slate-900">Weak-network resilient</h2>
              <p className="mt-1 text-sm text-slate-600">
                Lightweight exam screens save every tap locally and sync batched drafts so short
                dropouts never lose answers.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 inline-flex rounded-lg bg-amber-100 p-2.5 text-amber-700">
                <Clock className="h-5 w-5" />
              </div>
              <h2 className="font-bold text-slate-900">Server-enforced timing</h2>
              <p className="mt-1 text-sm text-slate-600">
                Server deadlines, per-student shuffled questions/options, negative marking, and
                automatic submit on expiry.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 inline-flex rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="font-bold text-slate-900">Standard exam protection</h2>
              <p className="mt-1 text-sm text-slate-600">
                Copy/print block, faint student-roll watermark, second-device takeover alerts, and
                server-only answer keys.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 inline-flex rounded-lg bg-navy/10 p-2.5 text-navy">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="font-bold text-slate-900">BYOK AI &amp; PDF draft import</h2>
              <p className="mt-1 text-sm text-slate-600">
                Bring your own free Gemini or Groq key. Browser-side PDF processing keeps storage
                at zero bytes.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 inline-flex rounded-lg bg-amber-100 p-2.5 text-amber-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="font-bold text-slate-900">Question bank &amp; practice</h2>
              <p className="mt-1 text-sm text-slate-600">
                Reuse shared questions safely—active exam questions stay hidden from student search
                until exams close.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 inline-flex rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h2 className="font-bold text-slate-900">Crisp Bangla exports</h2>
              <p className="mt-1 text-sm text-slate-600">
                Print-ready Bangla question papers and answer keys, UTF-8 BOM Excel CSVs, and Word
                exports directly from your browser.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber" />
            ProsnoPro — Step 1 Foundation (Auth, Onboarding &amp; Bangla Spike)
          </span>
          <div className="flex items-center gap-4">
            <Link href="/api/health" className="hover:text-slate-800">
              Health Status
            </Link>
            <Link href="/tools/bangla-spike" className="hover:text-slate-800">
              Bangla PDF Spike
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
