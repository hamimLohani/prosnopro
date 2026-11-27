"use client";

import { Loader2, Lock, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exam, ExamMedium, ResultReleaseMode } from "@/lib/types";
import { generateExamCode, isValidExamCode, normalizeExamCode } from "@/lib/validation";

interface TeacherExamFormProps {
  mode: "create" | "edit";
  exam?: Exam;
  hasAttempts?: boolean;
}

function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TeacherExamForm({ mode, exam, hasAttempts = false }: TeacherExamFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(exam);

  const [name, setName] = useState(exam?.name ?? "");
  const [subject, setSubject] = useState(exam?.subject ?? "");
  const [medium, setMedium] = useState<ExamMedium>(exam?.medium ?? "bn");
  const [code, setCode] = useState(() => exam?.code ?? generateExamCode());
  const [durationMinutes, setDurationMinutes] = useState(String(exam?.duration_minutes ?? 30));
  const [optionsPerQuestion, setOptionsPerQuestion] = useState(
    String(exam?.options_per_question ?? 4),
  );
  const [defaultMarks, setDefaultMarks] = useState(String(exam?.default_marks ?? 1));
  const [negativeMarking, setNegativeMarking] = useState(exam?.negative_marking ?? false);
  const [negativeValue, setNegativeValue] = useState(String(exam?.negative_value ?? 0.25));
  const [shuffleQuestions, setShuffleQuestions] = useState(exam?.shuffle_questions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(exam?.shuffle_options ?? false);
  const [scheduleEnabled, setScheduleEnabled] = useState(exam?.schedule_enabled ?? false);
  const [opensAt, setOpensAt] = useState(() => toLocalDateTimeInput(exam?.opens_at));
  const [closesAt, setClosesAt] = useState(() => toLocalDateTimeInput(exam?.closes_at));
  const [forceCloseActive, setForceCloseActive] = useState(exam?.force_close_active ?? false);
  const [instructions, setInstructions] = useState(exam?.instructions ?? "");
  const [resultRelease, setResultRelease] = useState<ResultReleaseMode>(
    exam?.result_release ?? "after_submit",
  );
  const [showAnswers, setShowAnswers] = useState(exam?.show_answers ?? true);
  const [practiceSharing, setPracticeSharing] = useState(exam?.practice_sharing ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const cleanName = name.trim();
    const cleanCode = normalizeExamCode(code);
    const parsedDuration = Number(durationMinutes);
    const parsedOptions = Number(optionsPerQuestion);
    const parsedMarks = Number(defaultMarks);
    const parsedNeg = negativeMarking ? Number(negativeValue) : 0;

    if (!cleanName) {
      setError("Exam name is required.");
      return;
    }
    if (!isValidExamCode(cleanCode)) {
      setError("Exam Code must be 3–16 English letters or digits.");
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 600) {
      setError("Duration must be between 1 and 600 minutes.");
      return;
    }
    if (!Number.isInteger(parsedOptions) || parsedOptions < 2 || parsedOptions > 6) {
      setError("Options per question must be between 2 and 6.");
      return;
    }
    if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
      setError("Default marks must be greater than 0.");
      return;
    }
    if (negativeMarking && (!Number.isFinite(parsedNeg) || parsedNeg < 0)) {
      setError("Negative deduction must be 0 or greater.");
      return;
    }

    let opensIso: string | null = null;
    let closesIso: string | null = null;
    if (scheduleEnabled) {
      if (!opensAt || !closesAt) {
        setError("Provide both opens-at and closes-at times when scheduling is enabled.");
        return;
      }
      const o = new Date(opensAt);
      const c = new Date(closesAt);
      if (Number.isNaN(o.getTime()) || Number.isNaN(c.getTime()) || c <= o) {
        setError("Closes-at must be after opens-at.");
        return;
      }
      opensIso = o.toISOString();
      closesIso = c.toISOString();
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const payload = {
      name: cleanName,
      subject: subject.trim(),
      medium,
      code: cleanCode,
      duration_minutes: parsedDuration,
      options_per_question: parsedOptions,
      default_marks: parsedMarks,
      negative_marking: negativeMarking,
      negative_value: parsedNeg,
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      schedule_enabled: scheduleEnabled,
      opens_at: opensIso,
      closes_at: closesIso,
      force_close_active: forceCloseActive,
      instructions: instructions.trim(),
      result_release: resultRelease,
      show_answers: showAnswers,
      practice_sharing: practiceSharing,
    };

    if (isEdit && exam) {
      const { error: updateErr } = await supabase
        .from("exams")
        .update(payload)
        .eq("id", exam.id);

      setSaving(false);
      if (updateErr) {
        setError(updateErr.message);
        return;
      }
      router.push(`/teacher/exams/${exam.id}`);
      router.refresh();
      return;
    }

    const { data: created, error: insertErr } = await supabase
      .from("exams")
      .insert({
        ...payload,
        teacher_id: user.id,
        status: "draft",
      })
      .select("id")
      .single<{ id: string }>();

    setSaving(false);
    if (insertErr || !created) {
      setError(
        insertErr?.code === "23505"
          ? "You already have another exam with this Exam Code."
          : (insertErr?.message ?? "Could not create exam."),
      );
      return;
    }

    router.push(`/teacher/exams/${created.id}/questions`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasAttempts && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            Students have already started this exam, so structural settings (duration, option count,
            negative marking, and shuffle flags) are locked.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Basic Details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-navy">Exam Details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="exam-name" className="block text-sm font-medium text-slate-700">
              Exam title
            </label>
            <input
              id="exam-name"
              type="text"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HSC Physics 1st Paper — Chapter 4 Quiz"
              className="h-[42px] w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-subject" className="block text-sm font-medium text-slate-700">
              Subject
            </label>
            <input
              id="exam-subject"
              type="text"
              maxLength={100}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. পদার্থবিজ্ঞান / Physics"
              className="h-[42px] w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-medium" className="block text-sm font-medium text-slate-700">
              Medium
            </label>
            <select
              id="exam-medium"
              value={medium}
              onChange={(e) => setMedium(e.target.value as ExamMedium)}
              className="h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            >
              <option value="bn">Bangla (বাংলা)</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-code" className="block text-sm font-medium text-slate-700">
              Exam Code <span className="text-xs font-normal text-slate-500">(3–16 chars)</span>
            </label>
            <div className="flex gap-2">
              <input
                id="exam-code"
                type="text"
                required
                maxLength={16}
                value={code}
                onChange={(e) => setCode(normalizeExamCode(e.target.value))}
                className="h-[42px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase tracking-wider focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
              <button
                type="button"
                onClick={() => setCode(generateExamCode())}
                title="Generate random code"
                className="inline-flex h-[42px] shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Random</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-duration" className="block text-sm font-medium text-slate-700">
              Total time (minutes)
            </label>
            <input
              id="exam-duration"
              type="number"
              min={1}
              max={600}
              disabled={hasAttempts}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="h-[42px] w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-100 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
        </div>
      </section>

      {/* Marking & Shuffle */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-navy">Marking &amp; Randomization</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="exam-options" className="block text-sm font-medium text-slate-700">
              Options per question
            </label>
            <select
              id="exam-options"
              disabled={hasAttempts}
              value={optionsPerQuestion}
              onChange={(e) => setOptionsPerQuestion(e.target.value)}
              className="h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 disabled:bg-slate-100"
            >
              <option value="2">2 options</option>
              <option value="3">3 options</option>
              <option value="4">4 options (Standard)</option>
              <option value="5">5 options</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-marks" className="block text-sm font-medium text-slate-700">
              Default marks / question
            </label>
            <input
              id="exam-marks"
              type="number"
              step="0.25"
              min="0.25"
              value={defaultMarks}
              onChange={(e) => setDefaultMarks(e.target.value)}
              className="h-[42px] w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-neg-val" className="block text-sm font-medium text-slate-700">
              Negative deduction
            </label>
            <input
              id="exam-neg-val"
              type="number"
              step="0.05"
              min="0"
              disabled={hasAttempts || !negativeMarking}
              value={negativeMarking ? negativeValue : "0"}
              onChange={(e) => setNegativeValue(e.target.value)}
              className="h-[42px] w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-100 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 pt-1">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              disabled={hasAttempts}
              checked={negativeMarking}
              onChange={(e) => setNegativeMarking(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-navy"
            />
            <span>Enable negative marking</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              disabled={hasAttempts}
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-navy"
            />
            <span>Shuffle questions per student</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              disabled={hasAttempts}
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-navy"
            />
            <span>Shuffle options per student</span>
          </label>
        </div>
      </section>

      {/* Schedule, Instructions & Results */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-navy">Schedule, Instructions &amp; Result Release</h2>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-navy"
          />
          <span>Restrict exam to a scheduled opens-at / closes-at window</span>
        </label>

        {scheduleEnabled && (
          <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="opens-at" className="block text-xs font-semibold text-slate-700">
                Opens at (local time)
              </label>
              <input
                id="opens-at"
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="closes-at" className="block text-xs font-semibold text-slate-700">
                Closes at (local time)
              </label>
              <input
                id="closes-at"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="exam-instructions" className="block text-sm font-medium text-slate-700">
            Custom instructions for students <span className="text-xs font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="exam-instructions"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Do not use calculators. Read every question carefully before submitting."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="result-release" className="block text-sm font-medium text-slate-700">
              Result release
            </label>
            <select
              id="result-release"
              value={resultRelease}
              onChange={(e) => setResultRelease(e.target.value as ResultReleaseMode)}
              className="h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            >
              <option value="after_submit">Immediately after student submits</option>
              <option value="after_close">After the exam closes</option>
              <option value="manual">Manual release by teacher</option>
              <option value="teacher_only">Teacher only (never shown to students)</option>
            </select>
          </div>

          <div className="flex flex-col justify-end gap-2.5 pb-1">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showAnswers}
                onChange={(e) => setShowAnswers(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-navy"
              />
              <span>Show correct answers &amp; explanations in released results</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={practiceSharing}
                onChange={(e) => setPracticeSharing(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-navy"
              />
              <span>Allow questions in student practice search after close</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={forceCloseActive}
                onChange={(e) => setForceCloseActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-navy"
              />
              <span>Force-close active attempts immediately if closed manually</span>
            </label>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{isEdit ? "Save settings" : "Save & Add Questions"}</span>
        </button>
      </div>
    </form>
  );
}
