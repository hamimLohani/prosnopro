"use client";

import { ArrowRight, Clock, HelpCircle, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ExamInstructionDetails {
  id: string;
  name: string;
  subject: string;
  medium: "bn" | "en";
  teacher_name: string;
  question_count: number;
  total_marks: number;
  duration_minutes: number;
  negative_marking: boolean;
  negative_value: number;
  instructions: string;
  schedule_enabled: boolean;
  closes_at: string | null;
}

interface ExamInstructionsClientProps {
  exam: ExamInstructionDetails;
}

export function ExamInstructionsClient({ exam }: ExamInstructionsClientProps) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);

  function handleStart() {
    if (!acknowledged) return;
    const key = `prosnopro_sid_${exam.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, crypto.randomUUID());
    }
    router.push(`/student/exams/${exam.id}/take`);
  }

  return (
    <>
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8 space-y-5 sm:space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Exam-এর নির্দেশাবলি
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">{exam.name}</h1>
          <p className="text-sm text-slate-600">
            {exam.subject || "General"} • {exam.medium === "bn" ? "বাংলা" : "English"} • Teacher:{" "}
            <span className="font-medium text-slate-800">{exam.teacher_name}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <div className="rounded-xl bg-slate-50 p-3 sm:p-3.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-navy" /> সময়সীমা
            </span>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">
              {exam.duration_minutes} মিনিট
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 sm:p-3.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <HelpCircle className="h-3.5 w-3.5 text-navy" /> প্রশ্ন
            </span>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">
              {exam.question_count}টি ({exam.total_marks} নম্বর)
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 sm:p-3.5 col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-500">Negative marking</span>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">
              {exam.negative_marking ? `-${exam.negative_value} / ভুল` : "নেই"}
            </p>
          </div>
        </div>

        {exam.instructions && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Teacher-এর নির্দেশনা
            </p>
            <p className="text-sm whitespace-pre-wrap text-slate-800">{exam.instructions}</p>
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Exam-এর নিয়ম ও সুরক্ষা</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-amber-900">
            <li>সব প্রশ্ন এক পেজে দেখা যাবে এবং শেষে (অথবা সময় শেষ হলে) Submit হবে।</li>
            <li>প্রতিটি উত্তর ট্যাপ করার সাথে সাথে ফোনে Save হয় এবং নিয়মিত Server-এ ব্যাকআপ হয়।</li>
            <li>উত্তর না দেওয়া প্রশ্নে কোনো Negative নম্বর কাটা হবে না।</li>
            <li>
              Copy/Print বন্ধ থাকবে, আপনার নাম/Roll-সহ Watermark দেখাবে এবং Tab switch, Window
              blur, Copy চেষ্টা বা অন্য ডিভাইস থেকে ঢোকার তথ্য Teacher দেখতে পাবেন।
            </li>
          </ul>
        </div>

        <label className="flex min-h-[48px] items-start gap-3 rounded-xl border border-slate-200 p-3.5 text-sm text-slate-800 active:bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-navy"
          />
          <span>আমি নিয়মগুলো পড়েছি এবং এখনই টাইমড Exam শুরু করতে প্রস্তুত।</span>
        </label>

        <button
          type="button"
          disabled={!acknowledged}
          onClick={handleStart}
          className="hidden sm:flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-strong disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <span>Exam শুরু করুন</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Sticky mobile bottom Start bar in thumb zone */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <button
          type="button"
          disabled={!acknowledged}
          onClick={handleStart}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-strong active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <span>{acknowledged ? "এখনই Exam শুরু করুন" : "শুরু করতে উপরের নিয়মে টিক দিন"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
