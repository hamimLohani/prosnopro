"use client";

import { ArrowRight, Clock, HelpCircle, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";

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
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
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
            {t("Exam-এর নির্দেশাবলি", "Exam Instructions")}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">{exam.name}</h1>
          <p className="text-sm text-slate-600">
            {exam.subject || "General"} •{" "}
            {exam.medium === "bn" ? t("বাংলা", "Bangla") : "English"} • Teacher:{" "}
            <span className="font-medium text-slate-800">{exam.teacher_name}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <div className="rounded-xl bg-slate-50 p-3 sm:p-3.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-navy" /> {t("সময়সীমা", "Duration")}
            </span>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">
              {t(`${exam.duration_minutes} মিনিট`, `${exam.duration_minutes} min`)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 sm:p-3.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <HelpCircle className="h-3.5 w-3.5 text-navy" /> {t("প্রশ্ন", "Questions")}
            </span>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">
              {t(
                `${exam.question_count}টি (${exam.total_marks} নম্বর)`,
                `${exam.question_count} Qs (${exam.total_marks} marks)`,
              )}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 sm:p-3.5 col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-500">Negative marking</span>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">
              {exam.negative_marking
                ? t(`-${exam.negative_value} / ভুল`, `-${exam.negative_value} / wrong`)
                : t("নেই", "None")}
            </p>
          </div>
        </div>

        {exam.instructions && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("Teacher-এর নির্দেশনা", "Teacher's Instructions")}
            </p>
            <p className="text-sm whitespace-pre-wrap text-slate-800">{exam.instructions}</p>
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{t("Exam-এর নিয়ম ও সুরক্ষা", "Exam Rules & Integrity")}</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-amber-900">
            <li>
              {t(
                "সব প্রশ্ন এক পেজে দেখা যাবে এবং শেষে (অথবা সময় শেষ হলে) Submit হবে।",
                "All questions appear on one page and can be submitted when done (or automatically when time runs out).",
              )}
            </li>
            <li>
              {t(
                "প্রতিটি উত্তর ট্যাপ করার সাথে সাথে ফোনে Save হয় এবং নিয়মিত Server-এ ব্যাকআপ হয়।",
                "Every tap saves locally on your device immediately and backs up regularly to the server.",
              )}
            </li>
            <li>
              {t(
                "উত্তর না দেওয়া প্রশ্নে কোনো Negative নম্বর কাটা হবে না।",
                "Unanswered questions never incur negative marking.",
              )}
            </li>
            <li>
              {t(
                "Copy/Print বন্ধ থাকবে, আপনার নাম/Roll-সহ Watermark দেখাবে এবং Tab switch, Window blur, Copy চেষ্টা বা অন্য ডিভাইস থেকে ঢোকার তথ্য Teacher দেখতে পাবেন।",
                "Copy/print is disabled, a watermark with your name/roll is shown, and tab switches, window blurs, copy attempts, or multi-device sessions are logged for the teacher.",
              )}
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
          <span>
            {t(
              "আমি নিয়মগুলো পড়েছি এবং এখনই টাইমড Exam শুরু করতে প্রস্তুত।",
              "I have read the rules and I am ready to start the timed exam now.",
            )}
          </span>
        </label>

        <button
          type="button"
          disabled={!acknowledged}
          onClick={handleStart}
          className="hidden sm:flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-strong disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <span>{t("Exam শুরু করুন", "Start Exam")}</span>
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
          <span>
            {acknowledged
              ? t("এখনই Exam শুরু করুন", "Start Exam Now")
              : t("শুরু করতে উপরের নিয়মে টিক দিন", "Check the box above to start")}
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
