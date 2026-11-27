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
      setError("Enter both Teacher Code and Exam Code.");
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
        setError(data.message ?? "Could not join exam.");
        setLoading(false);
        return;
      }

      const targetExamId = data.exam_id ?? data.exam?.id;
      if (!targetExamId) {
        setError("Unexpected response from server.");
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
      setError("Network error while joining exam. Please try again.");
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700 shrink-0">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Join an exam</h2>
            <p className="text-sm text-slate-600">
              Enter the Teacher Code and Exam Code provided by your teacher.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              required
              maxLength={12}
              value={teacherCode}
              onChange={(e) => setTeacherCode(normalizeTeacherCode(e.target.value))}
              placeholder="Teacher Code (e.g. RAHIM26)"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-slate-900 placeholder:normal-case placeholder:tracking-normal focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
            <input
              type="text"
              required
              maxLength={16}
              value={examCode}
              onChange={(e) => setExamCode(normalizeExamCode(e.target.value))}
              placeholder="Exam Code (e.g. PHY01)"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-slate-900 placeholder:normal-case placeholder:tracking-normal focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Join Exam</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
