"use client";

import { BookOpen, ChevronDown, ChevronUp, Loader2, Lock, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exam, ExamMedium, QuestionBankItem, ResultReleaseMode } from "@/lib/types";
import { generateExamCode, isValidExamCode, normalizeExamCode } from "@/lib/validation";

interface TeacherExamFormProps {
  mode: "create" | "edit";
  exam?: Exam;
  hasAttempts?: boolean;
  bankItems?: QuestionBankItem[];
}

function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TeacherExamForm({
  mode,
  exam,
  hasAttempts = false,
  bankItems = [],
}: TeacherExamFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(exam);

  const [name, setName] = useState(exam?.name ?? "");
  const [subject, setSubject] = useState(exam?.subject ?? "");
  const [classLevel, setClassLevel] = useState(exam?.class ?? "");
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
  const [showAdvanced, setShowAdvanced] = useState(isEdit);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankKeyword, setBankKeyword] = useState("");
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compatibleBank = useMemo(() => {
    const parsedOpt = Number(optionsPerQuestion);
    return bankItems.filter(
      (item) => item.medium === medium && item.options.length === parsedOpt,
    );
  }, [bankItems, medium, optionsPerQuestion]);

  const filteredBank = useMemo(() => {
    const kw = bankKeyword.trim().toLowerCase();
    if (!kw) return compatibleBank;
    return compatibleBank.filter((item) => {
      const hay = `${item.text} ${item.subject} ${item.class} ${item.tags.join(" ")}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [bankKeyword, compatibleBank]);

  const selectedCompatibleIds = useMemo(() => {
    const validSet = new Set(compatibleBank.map((b) => b.id));
    return selectedBankIds.filter((id) => validSet.has(id));
  }, [compatibleBank, selectedBankIds]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const cleanName = name.trim();
    const cleanClass = classLevel.trim();
    const cleanCode = normalizeExamCode(code);
    const parsedDuration = Number(durationMinutes);
    const parsedOptions = Number(optionsPerQuestion);
    const parsedMarks = Number(defaultMarks);
    const parsedNeg = negativeMarking ? Number(negativeValue) : 0;

    if (!cleanName) {
      setError("Exam-এর নাম দেওয়া আবশ্যক।");
      return;
    }
    if (!cleanClass) {
      setError("Class / শ্রেণি দেওয়া আবশ্যক।");
      return;
    }
    if (!isValidExamCode(cleanCode)) {
      setError("Exam Code অবশ্যই ৩–১৬টি English অক্ষর বা সংখ্যা হতে হবে।");
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 600) {
      setError("সময়সীমা ১ থেকে ৬০০ মিনিটের মধ্যে হতে হবে।");
      return;
    }
    if (!Number.isInteger(parsedOptions) || parsedOptions < 2 || parsedOptions > 6) {
      setError("প্রতি প্রশ্নে Option ২ থেকে ৬টির মধ্যে হতে হবে।");
      return;
    }
    if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
      setError("প্রতি প্রশ্নের নম্বর ০-এর বেশি হতে হবে।");
      return;
    }
    if (negativeMarking && (!Number.isFinite(parsedNeg) || parsedNeg < 0)) {
      setError("Negative marking ০ বা তার বেশি হতে হবে।");
      return;
    }

    let opensIso: string | null = null;
    let closesIso: string | null = null;
    if (scheduleEnabled) {
      if (!opensAt || !closesAt) {
        setError("Schedule চালু করলে শুরুর এবং শেষের সময় দিন।");
        return;
      }
      const o = new Date(opensAt);
      const c = new Date(closesAt);
      if (Number.isNaN(o.getTime()) || Number.isNaN(c.getTime()) || c <= o) {
        setError("শেষের সময় অবশ্যই শুরুর সময়ের পরে হতে হবে।");
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
      setError("Session শেষ হয়ে গেছে। আবার Sign in করুন।");
      setSaving(false);
      return;
    }

    const payload = {
      name: cleanName,
      subject: subject.trim(),
      class: classLevel.trim(),
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

    if (insertErr || !created) {
      setSaving(false);
      setError(
        insertErr?.code === "23505"
          ? "You already have another exam with this Exam Code."
          : (insertErr?.message ?? "Could not create exam."),
      );
      return;
    }

    const chosenBank = compatibleBank.filter((b) => selectedCompatibleIds.includes(b.id));
    if (chosenBank.length > 0) {
      const { error: qErr } = await supabase.from("questions").insert(
        chosenBank.map((b, idx) => ({
          exam_id: created.id,
          position: idx,
          text: b.text,
          options: b.options,
          correct_index: b.correct_index,
          explanation: b.explanation,
          marks: parsedMarks,
          bank_id: b.id,
        })),
      );
      if (qErr) {
        setSaving(false);
        setError(`Exam তৈরি হয়েছে, তবে Question Bank থেকে প্রশ্ন যোগ করতে সমস্যা হয়েছে: ${qErr.message}`);
        return;
      }
    }

    setSaving(false);
    router.push(`/teacher/exams/${created.id}/questions`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasAttempts && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            Student-রা ইতিমধ্যে এই Exam শুরু করেছে, তাই সময়সীমা, Option সংখ্যা, Negative marking ও
            Shuffle সেটিংস লক করা আছে।
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Basic Details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-navy">Exam-এর তথ্য</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="exam-name" className="block text-sm font-medium text-slate-700">
              Exam-এর নাম (Title)
            </label>
            <input
              id="exam-name"
              type="text"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: HSC Physics 1st Paper — Chapter 4 Quiz"
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-subject" className="block text-sm font-medium text-slate-700">
              Subject (বিষয়)
            </label>
            <input
              id="exam-subject"
              type="text"
              maxLength={100}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="যেমন: পদার্থবিজ্ঞান / Physics"
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-class" className="block text-sm font-medium text-slate-700">
              Class / শ্রেণি
            </label>
            <input
              id="exam-class"
              type="text"
              required
              list="exam-class-presets"
              maxLength={60}
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              placeholder="যেমন: Class 9-10 / HSC / Admission"
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
            <datalist id="exam-class-presets">
              <option value="Class 6" />
              <option value="Class 7" />
              <option value="Class 8" />
              <option value="Class 9-10" />
              <option value="SSC" />
              <option value="HSC" />
              <option value="Admission" />
              <option value="BCS / Job" />
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-medium" className="block text-sm font-medium text-slate-700">
              Medium (মাধ্যম)
            </label>
            <select
              id="exam-medium"
              value={medium}
              onChange={(e) => setMedium(e.target.value as ExamMedium)}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            >
              <option value="bn">বাংলা (Bangla)</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-code" className="block text-sm font-medium text-slate-700">
              Exam Code <span className="text-xs font-normal text-slate-500">(৩–১৬ অক্ষর)</span>
            </label>
            <div className="flex gap-2">
              <input
                id="exam-code"
                type="text"
                required
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={16}
                value={code}
                onChange={(e) => setCode(normalizeExamCode(e.target.value))}
                className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 font-mono text-base sm:text-sm uppercase tracking-wider focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
              <button
                type="button"
                onClick={() => setCode(generateExamCode())}
                title="Random Code তৈরি করুন"
                className="inline-flex h-11 sm:h-[42px] shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Random</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-duration" className="block text-sm font-medium text-slate-700">
              মোট সময় (মিনিট)
            </label>
            <input
              id="exam-duration"
              type="number"
              min={1}
              max={600}
              disabled={hasAttempts}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm disabled:bg-slate-100 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex min-h-[44px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-navy hover:bg-slate-50 cursor-pointer"
      >
        <span>Advanced Settings (Marking, Shuffle, Schedule ও Result)</span>
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showAdvanced && (
        <>
          {/* Marking & Shuffle */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-navy">Marking ও Randomization</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="exam-options" className="block text-sm font-medium text-slate-700">
              প্রতি প্রশ্নে Option সংখ্যা
            </label>
            <select
              id="exam-options"
              disabled={hasAttempts || Boolean(exam && exam.question_count > 0)}
              value={optionsPerQuestion}
              onChange={(e) => setOptionsPerQuestion(e.target.value)}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 disabled:bg-slate-100"
            >
              <option value="2">২টি Option</option>
              <option value="3">৩টি Option</option>
              <option value="4">৪টি Option (Standard)</option>
              <option value="5">৫টি Option</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-marks" className="block text-sm font-medium text-slate-700">
              প্রতি প্রশ্নের Default নম্বর
            </label>
            <input
              id="exam-marks"
              type="number"
              step="0.25"
              min="0.25"
              value={defaultMarks}
              onChange={(e) => setDefaultMarks(e.target.value)}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-neg-val" className="block text-sm font-medium text-slate-700">
              Negative কাটা নম্বর
            </label>
            <input
              id="exam-neg-val"
              type="number"
              step="0.05"
              min="0"
              disabled={hasAttempts || !negativeMarking}
              value={negativeMarking ? negativeValue : "0"}
              onChange={(e) => setNegativeValue(e.target.value)}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm disabled:bg-slate-100 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
        </div>

        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-3 pt-1">
          <label className="flex min-h-[40px] items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              disabled={hasAttempts}
              checked={negativeMarking}
              onChange={(e) => setNegativeMarking(e.target.checked)}
              className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
            />
            <span>Negative marking চালু করুন</span>
          </label>

          <label className="flex min-h-[40px] items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              disabled={hasAttempts}
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
            />
            <span>প্রশ্ন এলোমেলো (Shuffle) করুন</span>
          </label>

          <label className="flex min-h-[40px] items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              disabled={hasAttempts}
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
            />
            <span>Option এলোমেলো (Shuffle) করুন</span>
          </label>
        </div>
      </section>

      {/* Schedule, Instructions & Results */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-navy">Schedule, নির্দেশনা ও Result প্রকাশ</h2>

        <label className="flex min-h-[40px] items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
            className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
          />
          <span>নির্দিষ্ট শুরুর ও শেষের সময় (Schedule) নির্ধারণ করুন</span>
        </label>

        {scheduleEnabled && (
          <div className="grid gap-4 rounded-xl bg-slate-50 p-3.5 sm:p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="opens-at" className="block text-xs font-semibold text-slate-700">
                শুরুর সময় (Local time)
              </label>
              <input
                id="opens-at"
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="closes-at" className="block text-xs font-semibold text-slate-700">
                শেষের সময় (Local time)
              </label>
              <input
                id="closes-at"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="exam-instructions" className="block text-sm font-medium text-slate-700">
            Student-দের জন্য নির্দেশনা <span className="text-xs font-normal text-slate-400">(ঐচ্ছিক)</span>
          </label>
          <textarea
            id="exam-instructions"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="যেমন: ক্যালকুলেটর ব্যবহার করা যাবে না। Submit করার আগে সব প্রশ্ন ভালোভাবে দেখে নিন।"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="result-release" className="block text-sm font-medium text-slate-700">
              Result প্রকাশের নিয়ম
            </label>
            <select
              id="result-release"
              value={resultRelease}
              onChange={(e) => setResultRelease(e.target.value as ResultReleaseMode)}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            >
              <option value="after_submit">Student Submit করার সাথে সাথেই</option>
              <option value="after_close">Exam শেষ (Close) হওয়ার পর</option>
              <option value="manual">Teacher ম্যানুয়ালি প্রকাশ করবেন</option>
              <option value="teacher_only">শুধু Teacher দেখবেন (Student-দের নয়)</option>
            </select>
          </div>

          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex min-h-[38px] items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showAnswers}
                onChange={(e) => setShowAnswers(e.target.checked)}
                className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
              />
              <span>প্রকাশিত Result-এ সঠিক উত্তর ও ব্যাখ্যা দেখান</span>
            </label>

            <label className="flex min-h-[38px] items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={practiceSharing}
                onChange={(e) => setPracticeSharing(e.target.checked)}
                className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
              />
              <span>Exam শেষ হলে Student Practice-এ প্রশ্ন দেখান</span>
            </label>

            <label className="flex min-h-[38px] items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={forceCloseActive}
                onChange={(e) => setForceCloseActive(e.target.checked)}
                className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
              />
              <span>ম্যানুয়ালি Close করলে চলমান Exam সাথে সাথে শেষ করুন</span>
            </label>
          </div>
        </div>
      </section>
        </>
      )}

      {!isEdit && (
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBankPicker((v) => !v)}
            className="flex w-full items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-slate-50 cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-navy/10 p-2 text-navy shrink-0">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-navy">
                    Question Bank থেকে প্রশ্ন যোগ করুন (ঐচ্ছিক)
                  </span>
                  {selectedCompatibleIds.length > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      {selectedCompatibleIds.length}টি নির্বাচিত
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  আপনার সংরক্ষিত প্রশ্ন ({compatibleBank.length}টি ম্যাচিং প্রশ্ন) থেকে সরাসরি বাছাই করুন।
                </p>
              </div>
            </div>
            {showBankPicker ? (
              <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
            )}
          </button>

          {showBankPicker && (
            <div className="border-t border-slate-200 p-4 sm:p-5 space-y-3">
              {bankItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    আপনার Question Bank-এ এখনো কোনো প্রশ্ন নেই।
                  </p>
                  <Link
                    href="/teacher/bank"
                    className="inline-flex text-xs font-semibold text-navy hover:underline"
                  >
                    Question Bank-এ গিয়ে প্রশ্ন সংরক্ষণ করুন →
                  </Link>
                </div>
              ) : compatibleBank.length === 0 ? (
                <p className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900">
                  বর্তমান Medium ({medium === "bn" ? "বাংলা" : "English"}) ও {optionsPerQuestion} Option-এর সাথে মিলে এমন কোনো প্রশ্ন Question Bank-এ পাওয়া যায়নি।
                </p>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={bankKeyword}
                        onChange={(e) => setBankKeyword(e.target.value)}
                        placeholder="Search question bank by text, subject, or class..."
                        className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = filteredBank.map((b) => b.id);
                          setSelectedBankIds((prev) => Array.from(new Set([...prev, ...allIds])));
                        }}
                        className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        সবগুলো নির্বাচন ({filteredBank.length})
                      </button>
                      {selectedCompatibleIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedBankIds([])}
                          className="min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          মুছুন
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredBank.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">
                      সার্চ অনুযায়ী কোনো প্রশ্ন পাওয়া যায়নি।
                    </p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {filteredBank.map((item) => {
                        const checked = selectedCompatibleIds.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition cursor-pointer ${
                              checked
                                ? "border-navy bg-navy/5"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedBankIds((prev) =>
                                  e.target.checked
                                    ? [...prev, item.id]
                                    : prev.filter((id) => id !== item.id),
                                );
                              }}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-navy"
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="font-medium text-slate-900 line-clamp-2 break-words">
                                {item.text}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                {item.subject && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                                    {item.subject}
                                  </span>
                                )}
                                {item.class && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                                    {item.class}
                                  </span>
                                )}
                                <span>{item.options.length} Options</span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[44px] w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          বাতিল
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>
            {isEdit
              ? "Settings Save করুন"
              : selectedCompatibleIds.length > 0
                ? `Exam তৈরি ও ${selectedCompatibleIds.length}টি প্রশ্ন যোগ করুন`
                : "Save করে প্রশ্ন যোগ করুন"}
          </span>
        </button>
      </div>
    </form>
  );
}
