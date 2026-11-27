"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeExamCode, normalizeTeacherCode } from "@/lib/validation";

export function StudentJoinForm() {
  const router = useRouter();
  const [teacherCode, setTeacherCode] = useState("");
  const [examCode, setExamCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const tCode = normalizeTeacherCode(teacherCode);
    const eCode = normalizeExamCode(examCode);
    if (!tCode || !eCode) {
      setError("Teacher Code এবং Exam Code দুটিই লিখুন।");
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
        setError(data.message ?? "Exam-এ জয়েন করা যায়নি।");
        setLoading(false);
        return;
      }

      const targetExamId = data.exam_id ?? data.exam?.id;
      if (!targetExamId) {
        setError("Server থেকে অপ্রত্যাশিত উত্তর এসেছে।");
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
      setError("Exam-এ জয়েন করার সময় Network সমস্যা হয়েছে। আবার চেষ্টা করুন।");
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
            <h2 className="text-lg font-bold text-slate-900">Exam-এ জয়েন করুন</h2>
            <p className="text-sm text-slate-600">
              আপনার Teacher-এর দেওয়া Teacher Code এবং Exam Code লিখুন।
            </p>
          </div>
        </div>

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
              onChange={(e) => setTeacherCode(normalizeTeacherCode(e.target.value))}
              placeholder="যেমন: RAHIM26"
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
              onChange={(e) => setExamCode(normalizeExamCode(e.target.value))}
              placeholder="যেমন: PHY01"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-base sm:text-sm uppercase tracking-wider text-slate-900 placeholder:normal-case placeholder:tracking-normal focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Exam-এ জয়েন</span>
          </button>
        </form>
      </div>
    </section>
  );
}
