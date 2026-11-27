import { BookOpen, GraduationCap, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getCurrentUserContext } from "@/lib/supabase/server";

export default async function AboutPage() {
  const ctx = await getCurrentUserContext();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-3 py-6 sm:px-4 sm:py-10">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            About ProsnoPro
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">
            বাংলাদেশি শিক্ষক ও শিক্ষার্থীদের জন্য মোবাইল-বান্ধব অনলাইন MCQ Exam প্ল্যাটফর্ম
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            ProsnoPro (প্রশ্নপ্রো) তৈরি করা হয়েছে যেন শিক্ষকরা খুব সহজে বাংলা ও English-এ
            টাইমড MCQ পরীক্ষা নিতে পারেন এবং শিক্ষার্থীরা মোবাইল ফোন থেকেই কম নেটওয়ার্কেও নিরাপদভাবে
            পরীক্ষা দিতে পারে।
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
            <div className="inline-flex rounded-lg bg-navy/10 p-2 text-navy">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Teacher-দের সুবিধা</h2>
            <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-slate-600">
              <li>ইউনিক Teacher Code ও Exam Code দিয়ে পরীক্ষা নেওয়া।</li>
              <li>Manual, Question Bank, নিজস্ব AI Key ও PDF Import থেকে প্রশ্ন তৈরি।</li>
              <li>Live Monitor এবং Excel, CSV, Word (.docx) ও Print/PDF Export।</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
            <div className="inline-flex rounded-lg bg-amber-100 p-2 text-amber-700">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Student-দের সুবিধা</h2>
            <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-slate-600">
              <li>মোবাইলে সহজ উত্তর প্রদান ও স্বয়ংক্রিয় Offline ব্যাকআপ।</li>
              <li>পরীক্ষা শেষে Score, সঠিক উত্তর ও ব্যাখ্যা দেখা।</li>
              <li>আগের ও Shared প্রশ্ন দিয়ে Practice Search করা।</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
            <div className="inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <Smartphone className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Mobile-First ও কম ডাটা</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              দুর্বল 3G/4G নেটওয়ার্কেও প্রতিটি উত্তর ফোনে Save থাকে এবং নেটওয়ার্ক ফিরলে Server-এ
              Sync হয়।
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
            <div className="inline-flex rounded-lg bg-purple-100 p-2 text-purple-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">বাংলা, English ও গণিত (KaTeX)</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              বাংলা ইউনিকোড, English এবং <code className="font-mono">$...$</code> দিয়ে পদার্থবিজ্ঞান,
              রসায়ন ও গণিতের সূত্র সুন্দরভাবে প্রদর্শিত হয়।
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-navy shrink-0" />
            <span>ProsnoPro • Online MCQ Exam Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="font-semibold text-navy hover:underline">
              Privacy Notice
            </Link>
            <Link href="/" className="font-semibold text-navy hover:underline">
              ← হোম পেজে ফিরে যান
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
