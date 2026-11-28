"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";
import { normalizeExamCode, normalizeTeacherCode } from "@/lib/validation";

interface StudentJoinFormProps {
  initialTeacherCode?: string;
  initialExamCode?: string;
}

export function StudentJoinForm({
  initialTeacherCode = "",
  initialExamCode = "",
}: StudentJoinFormProps) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [teacherCode, setTeacherCode] = useState(() => normalizeTeacherCode(initialTeacherCode));
  const [examCode, setExamCode] = useState(() => normalizeExamCode(initialExamCode));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFilledNote, setAutoFilledNote] = useState<string | null>(() =>
    initialTeacherCode && initialExamCode
      ? t(
          "লিংক থেকে Teacher Code ও Exam Code Auto-fill হয়েছে।",
          "Teacher Code and Exam Code were auto-filled from the link.",
        )
      : null,
  );

  function handleSmartPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;

    const teacherMatch = pasted.match(/Teacher\s*Code\s*[:\-]\s*([A-Za-z0-9]{3,16})/i);
    const examMatch = pasted.match(/Exam\s*Code\s*[:\-]\s*([A-Za-z0-9]{3,16})/i);

    if (teacherMatch || examMatch) {
      e.preventDefault();
      if (teacherMatch) setTeacherCode(normalizeTeacherCode(teacherMatch[1]));
      if (examMatch) setExamCode(normalizeExamCode(examMatch[1]));
      setAutoFilledNote(
        t(
          "Invite মেসেজ থেকে Code Auto-fill হয়েছে!",
          "Codes auto-filled from invite message!",
        ),
      );
      setError(null);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const tCode = normalizeTeacherCode(teacherCode);
    const eCode = normalizeExamCode(examCode);
    if (!tCode || !eCode) {
      setError(
        t(
          "Teacher Code এবং Exam Code দুটিই লিখুন।",
          "Please enter both Teacher Code and Exam Code.",
        ),
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/student/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherCode: tCode, examCode: eCode }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        state?: "ready" | "resume" | "already_submitted";
        exam_id?: string;
        exam?: { id: string };
        message?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.message ?? t("Exam-এ জয়েন করা যায়নি।", "Could not join exam."));
        setLoading(false);
        return;
      }

      const targetExamId = data.exam_id ?? data.exam?.id;
      if (!targetExamId) {
        setError(
          t(
            "Server থেকে অপ্রত্যাশিত উত্তর এসেছে।",
            "Unexpected response from server.",
          ),
        );
        setLoading(false);
        return;
      }

      if (data.state === "already_submitted") {
        router.push(`/student/exams/${targetExamId}/submitted`);
      } else if (data.state === "resume") {
        router.push(`/student/exams/${targetExamId}/take`);
      } else {
        router.push(`/student/exams/${targetExamId}/instructions`);
      }
    } catch {
      setError(
        t(
          "Exam-এ জয়েন করার সময় Network সমস্যা হয়েছে। আবার চেষ্টা করুন।",
          "Network error while joining exam. Please try again.",
        ),
      );
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700 shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t("Exam-এ জয়েন করুন", "Join an Exam")}
            </h2>
            <p className="text-sm text-slate-600">
              {t(
                "আপনার Teacher-এর দেওয়া Teacher Code ও Exam Code লিখুন (অথবা পুরো Invite মেসেজ পেস্ট করুন)।",
                "Enter your Teacher Code and Exam Code (or paste the full invite message).",
              )}
            </p>
          </div>
        </div>

        {autoFilledNote && !error && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
            {autoFilledNote}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1">
            <label htmlFor="join-teacher-code" className="block text-xs font-semibold text-slate-700">
              Teacher Code
            </label>
            <input
              id="join-teacher-code"
              type="text"
              required
              maxLength={12}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="next"
              value={teacherCode}
              onPaste={handleSmartPaste}
              onChange={(e) => setTeacherCode(normalizeTeacherCode(e.target.value))}
              placeholder={t("যেমন: RAHIM26", "e.g. RAHIM26")}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-base sm:text-sm uppercase tracking-wider text-slate-900 placeholder:normal-case placeholder:tracking-normal focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="join-exam-code" className="block text-xs font-semibold text-slate-700">
              Exam Code
            </label>
            <input
              id="join-exam-code"
              type="text"
              required
              maxLength={16}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              value={examCode}
              onPaste={handleSmartPaste}
              onChange={(e) => setExamCode(normalizeExamCode(e.target.value))}
              placeholder={t("যেমন: PHY01", "e.g. PHY01")}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-base sm:text-sm uppercase tracking-wider text-slate-900 placeholder:normal-case placeholder:tracking-normal focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{t("Exam-এ জয়েন", "Join Exam")}</span>
          </button>
        </form>
      </div>
    </section>
  );
}
