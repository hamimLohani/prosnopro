"use client";

import { ChevronDown, ChevronUp, Loader2, Lock, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClassSelect } from "@/components/class-select";
import { useLang } from "@/components/language-provider";
import { SearchableSubjectSelect } from "@/components/searchable-subject-select";
import { pickText } from "@/lib/i18n";
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
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
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
  const [practiceSharing, setPracticeSharing] = useState(exam?.practice_sharing ?? true);
  const [showAdvanced, setShowAdvanced] = useState(isEdit);

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
    const cleanClass = classLevel.trim();
    const cleanCode = normalizeExamCode(code);
    const parsedDuration = Number(durationMinutes);
    const parsedOptions = Number(optionsPerQuestion);
    const parsedMarks = Number(defaultMarks);
    const parsedNeg = negativeMarking ? Number(negativeValue) : 0;

    if (!cleanName) {
      setError(t("Exam-এর নাম দেওয়া আবশ্যক।", "Exam title is required."));
      return;
    }
    if (!cleanClass) {
      setError(t("Class / শ্রেণি দেওয়া আবশ্যক।", "Class / Level is required."));
      return;
    }
    if (!isValidExamCode(cleanCode)) {
      setError(
        t(
          "Exam Code অবশ্যই ৩–১৬টি English অক্ষর বা সংখ্যা হতে হবে।",
          "Exam Code must be 3–16 English letters or digits.",
        ),
      );
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 600) {
      setError(
        t(
          "সময়সীমা ১ থেকে ৬০০ মিনিটের মধ্যে হতে হবে।",
          "Duration must be between 1 and 600 minutes.",
        ),
      );
      return;
    }
    if (!Number.isInteger(parsedOptions) || parsedOptions < 2 || parsedOptions > 6) {
      setError(
        t(
          "প্রতি প্রশ্নে Option ২ থেকে ৬টির মধ্যে হতে হবে।",
          "Options per question must be between 2 and 6.",
        ),
      );
      return;
    }
    if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
      setError(t("প্রতি প্রশ্নের নম্বর ০-এর বেশি হতে হবে।", "Default marks must be greater than 0."));
      return;
    }
    if (negativeMarking && (!Number.isFinite(parsedNeg) || parsedNeg < 0)) {
      setError(t("Negative marking ০ বা তার বেশি হতে হবে।", "Negative marking value must be 0 or more."));
      return;
    }

    let opensIso: string | null = null;
    let closesIso: string | null = null;
    if (scheduleEnabled) {
      if (!opensAt || !closesAt) {
        setError(
          t(
            "Schedule চালু করলে শুরুর এবং শেষের সময় দিন।",
            "Enter both start and end times when schedule is enabled.",
          ),
        );
        return;
      }
      const o = new Date(opensAt);
      const c = new Date(closesAt);
      if (Number.isNaN(o.getTime()) || Number.isNaN(c.getTime()) || c <= o) {
        setError(
          t(
            "শেষের সময় অবশ্যই শুরুর সময়ের পরে হতে হবে।",
            "End time must be later than start time.",
          ),
        );
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
      setError(t("Session শেষ হয়ে গেছে। আবার Sign in করুন।", "Session expired. Please sign in again."));
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

    setSaving(false);
    if (insertErr || !created) {
      setError(
        insertErr?.code === "23505"
          ? t("আপনার আরেকটি Exam-এ ইতিমধ্যেই এই Exam Code আছে।", "You already have another exam with this Exam Code.")
          : (insertErr?.message ?? t("Exam তৈরি করা যায়নি।", "Could not create exam.")),
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
            {t(
              "Student-রা ইতিমধ্যে এই Exam শুরু করেছে, তাই সময়সীমা, Option সংখ্যা, Negative marking ও Shuffle সেটিংস লক করা আছে।",
              "Students have already started this exam, so duration, option count, negative marking, and shuffle settings are locked.",
            )}
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
        <h2 className="text-base font-bold text-navy">{t("Exam-এর তথ্য", "Exam Details")}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="exam-name" className="block text-sm font-medium text-slate-700">
              {t("Exam-এর নাম (Title)", "Exam Title")}
            </label>
            <input
              id="exam-name"
              type="text"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                "যেমন: HSC Physics 1st Paper — Chapter 4 Quiz",
                "e.g. HSC Physics 1st Paper — Chapter 4 Quiz",
              )}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-subject" className="block text-sm font-medium text-slate-700">
              {t("Subject (বিষয়)", "Subject")}
            </label>
            <SearchableSubjectSelect
              id="exam-subject"
              value={subject}
              onChange={setSubject}
              placeholder={t("বিষয় নির্বাচন করুন", "Select Subject")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-class" className="block text-sm font-medium text-slate-700">
              {t("Class / Level (শ্রেণি / লেভেল)", "Class / Level")}
            </label>
            <ClassSelect
              id="exam-class"
              required
              value={classLevel}
              onChange={setClassLevel}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-medium" className="block text-sm font-medium text-slate-700">
              {t("Medium (মাধ্যম)", "Medium")}
            </label>
            <select
              id="exam-medium"
              value={medium}
              onChange={(e) => setMedium(e.target.value as ExamMedium)}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            >
              <option value="bn">{t("বাংলা (Bangla)", "Bangla")}</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-code" className="block text-sm font-medium text-slate-700">
              Exam Code{" "}
              <span className="text-xs font-normal text-slate-500">
                ({t("৩–১৬ অক্ষর", "3–16 chars")})
              </span>
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
                title={t("Random Code তৈরি করুন", "Generate random code")}
                className="inline-flex h-11 sm:h-[42px] shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Random</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="exam-duration" className="block text-sm font-medium text-slate-700">
              {t("মোট সময় (মিনিট)", "Total Duration (minutes)")}
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
        <span>
          {t(
            "Advanced Settings (Marking, Shuffle, Schedule ও Result)",
            "Advanced Settings (Marking, Shuffle, Schedule & Results)",
          )}
        </span>
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showAdvanced && (
        <>
          {/* Marking & Shuffle */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-navy">
              {t("Marking ও Randomization", "Marking & Randomization")}
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor="exam-options" className="block text-sm font-medium text-slate-700">
                  {t("প্রতি প্রশ্নে Option সংখ্যা", "Options per Question")}
                </label>
                <select
                  id="exam-options"
                  disabled={hasAttempts || Boolean(exam && exam.question_count > 0)}
                  value={optionsPerQuestion}
                  onChange={(e) => setOptionsPerQuestion(e.target.value)}
                  className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 disabled:bg-slate-100"
                >
                  <option value="2">{t("২টি Option", "2 Options")}</option>
                  <option value="3">{t("৩টি Option", "3 Options")}</option>
                  <option value="4">{t("৪টি Option (Standard)", "4 Options (Standard)")}</option>
                  <option value="5">{t("৫টি Option", "5 Options")}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="exam-marks" className="block text-sm font-medium text-slate-700">
                  {t("প্রতি প্রশ্নের Default নম্বর", "Default Marks per Question")}
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
                  {t("Negative কাটা নম্বর", "Negative Deduction")}
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
                <span>{t("Negative marking চালু করুন", "Enable negative marking")}</span>
              </label>

              <label className="flex min-h-[40px] items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={hasAttempts}
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
                />
                <span>{t("প্রশ্ন এলোমেলো (Shuffle) করুন", "Shuffle questions")}</span>
              </label>

              <label className="flex min-h-[40px] items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={hasAttempts}
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
                />
                <span>{t("Option এলোমেলো (Shuffle) করুন", "Shuffle options")}</span>
              </label>
            </div>
          </section>

          {/* Schedule, Instructions & Results */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-navy">
              {t("Schedule, নির্দেশনা ও Result প্রকাশ", "Schedule, Instructions & Results")}
            </h2>

            <label className="flex min-h-[40px] items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
              />
              <span>
                {t(
                  "নির্দিষ্ট শুরুর ও শেষের সময় (Schedule) নির্ধারণ করুন",
                  "Set specific start and end time (Schedule)",
                )}
              </span>
            </label>

            {scheduleEnabled && (
              <div className="grid gap-4 rounded-xl bg-slate-50 p-3.5 sm:p-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="opens-at" className="block text-xs font-semibold text-slate-700">
                    {t("শুরুর সময় (Local time)", "Starts At (Local time)")}
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
                    {t("শেষের সময় (Local time)", "Closes At (Local time)")}
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
                {t("Student-দের জন্য নির্দেশনা", "Instructions for Students")}{" "}
                <span className="text-xs font-normal text-slate-400">
                  ({t("ঐচ্ছিক", "optional")})
                </span>
              </label>
              <textarea
                id="exam-instructions"
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t(
                  "যেমন: ক্যালকুলেটর ব্যবহার করা যাবে না। Submit করার আগে সব প্রশ্ন ভালোভাবে দেখে নিন।",
                  "e.g. Calculators are not allowed. Review all answers before submitting.",
                )}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="result-release" className="block text-sm font-medium text-slate-700">
                  {t("Result প্রকাশের নিয়ম", "Result Release Policy")}
                </label>
                <select
                  id="result-release"
                  value={resultRelease}
                  onChange={(e) => setResultRelease(e.target.value as ResultReleaseMode)}
                  className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                >
                  <option value="after_submit">
                    {t("Student Submit করার সাথে সাথেই", "Immediately after student submits")}
                  </option>
                  <option value="after_close">
                    {t("Exam শেষ (Close) হওয়ার পর", "After exam is closed")}
                  </option>
                  <option value="manual">
                    {t("Teacher ম্যানুয়ালি প্রকাশ করবেন", "Released manually by teacher")}
                  </option>
                  <option value="teacher_only">
                    {t("শুধু Teacher দেখবেন (Student-দের নয়)", "Teacher only (hidden from students)")}
                  </option>
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
                  <span>
                    {t(
                      "প্রকাশিত Result-এ সঠিক উত্তর ও ব্যাখ্যা দেখান",
                      "Show correct answers & explanations with released results",
                    )}
                  </span>
                </label>

                <label className="flex min-h-[38px] items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={practiceSharing}
                    onChange={(e) => setPracticeSharing(e.target.checked)}
                    className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
                  />
                  <span>
                    {t(
                      "Exam শেষ হলে Student Practice-এ প্রশ্ন দেখান",
                      "Share questions to Student Practice after exam closes",
                    )}
                  </span>
                </label>

                <label className="flex min-h-[38px] items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceCloseActive}
                    onChange={(e) => setForceCloseActive(e.target.checked)}
                    className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
                  />
                  <span>
                    {t(
                      "ম্যানুয়ালি Close করলে চলমান Exam সাথে সাথে শেষ করুন",
                      "End in-progress attempts immediately when closed manually",
                    )}
                  </span>
                </label>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[44px] w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          {t("বাতিল", "Cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>
            {isEdit
              ? t("Settings Save করুন", "Save Settings")
              : t("Save করে প্রশ্ন যোগ করুন", "Save & Add Questions")}
          </span>
        </button>
      </div>
    </form>
  );
}
