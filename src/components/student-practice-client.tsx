"use client";

import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Search, ShieldAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MathText } from "@/components/math-text";
import { SearchableSubjectSelect } from "@/components/searchable-subject-select";
import { CLASS_OPTIONS } from "@/lib/academic-options";
import type { ExamMedium } from "@/lib/types";

export interface PracticeQuestionItem {
  id: string;
  text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  subject: string;
  class: string;
  medium: ExamMedium;
  source_label: string;
}

interface StudentPracticeClientProps {
  initialItems: PracticeQuestionItem[];
  blockedByExamId: string | null;
}

function optionLabel(index: number, medium: ExamMedium): string {
  if (medium === "bn") {
    return ["ক", "খ", "গ", "ঘ", "ঙ", "চ"][index] ?? String(index + 1);
  }
  return String.fromCharCode(65 + index);
}

export function StudentPracticeClient({
  initialItems,
  blockedByExamId,
}: StudentPracticeClientProps) {
  const [items, setItems] = useState<PracticeQuestionItem[]>(initialItems);
  const [activeExamId, setActiveExamId] = useState<string | null>(blockedByExamId);

  const [keyword, setKeyword] = useState("");
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [medium, setMedium] = useState<"all" | ExamMedium>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-card interactive selection & answer reveal state
  const [selectedByQid, setSelectedByQid] = useState<Record<string, number>>({});
  const [revealedByQid, setRevealedByQid] = useState<Record<string, boolean>>({});

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const qs = new URLSearchParams({
        keyword: keyword.trim(),
        subject: subject.trim(),
        class: classLevel.trim(),
        medium,
      });
      const res = await fetch(`/api/student/practice?${qs.toString()}`);
      const data = (await res.json()) as {
        ok?: boolean;
        code?: string;
        active_exam_id?: string;
        message?: string;
        items?: PracticeQuestionItem[];
      };

      if (res.status === 409 && data.code === "ATTEMPT_IN_PROGRESS") {
        setActiveExamId(data.active_exam_id ?? null);
        setItems([]);
        setLoading(false);
        return;
      }

      if (!res.ok || !data.ok) {
        setError(data.message ?? "Practice প্রশ্ন খোঁজা যায়নি।");
        setLoading(false);
        return;
      }

      setActiveExamId(null);
      setItems(data.items ?? []);
    } catch {
      setError("Practice প্রশ্ন খোঁজার সময় Network সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  }

  if (activeExamId) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-amber-950">
              চলমান Exam-এর সময় Practice Search বন্ধ থাকে
            </h2>
            <p className="text-sm text-amber-900">
              আপনার একটি Exam বর্তমানে চলমান আছে। Practice প্রশ্ন দেখার আগে Exam-টি Submit করুন।
            </p>
          </div>
        </div>
        <Link
          href={`/student/exams/${activeExamId}/take`}
          className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong"
        >
          <span>চলমান Exam-এ ফিরে যান</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 grid gap-2.5 sm:gap-3 sm:grid-cols-5"
      >
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            enterKeyHint="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search keyword..."
            className="h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-base sm:text-sm"
          />
        </div>
        <SearchableSubjectSelect
          value={subject}
          onChange={setSubject}
          allowCustom={false}
          placeholder="All Subjects"
          searchPlaceholder="Search subject..."
        />
        <select
          value={classLevel}
          onChange={(e) => setClassLevel(e.target.value)}
          className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm"
        >
          <option value="">All Classes</option>
          {CLASS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={medium}
            onChange={(e) => setMedium(e.target.value as "all" | ExamMedium)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-base sm:text-sm"
          >
            <option value="all">All Media</option>
            <option value="bn">Bangla</option>
            <option value="en">English</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Search</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          আপনার ফিল্টার অনুযায়ী কোনো Practice প্রশ্ন পাওয়া যায়নি।
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const chosen = selectedByQid[item.id];
            const revealed = Boolean(revealedByQid[item.id]);
            const showFeedback = revealed || typeof chosen === "number";

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                      {item.medium === "bn" ? "বাংলা" : "English"}
                    </span>
                    {item.subject && (
                      <span className="rounded bg-navy/10 px-2 py-0.5 font-medium text-navy">
                        {item.subject}
                      </span>
                    )}
                    {item.class && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                        {item.class}
                      </span>
                    )}
                    <span className="text-slate-400">উৎস: {item.source_label}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setRevealedByQid((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                    }
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 py-1 font-semibold text-navy hover:bg-slate-100 cursor-pointer"
                  >
                    {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{revealed ? "উত্তর লুকান" : "উত্তর দেখুন"}</span>
                  </button>
                </div>

                <p className="text-[15px] font-semibold leading-relaxed text-slate-900 sm:text-base">
                  {idx + 1}. <MathText text={item.text} />
                </p>

                <div className="grid gap-2 sm:grid-cols-2 text-[15px] sm:text-sm">
                  {item.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === item.correct_index;
                    const isChosen = chosen === optIdx;

                    let cardClass = "border-slate-200 bg-white text-slate-800 hover:bg-slate-50";
                    if (showFeedback && isCorrect) {
                      cardClass = "border-emerald-400 bg-emerald-50 font-semibold text-emerald-950";
                    } else if (showFeedback && isChosen && !isCorrect) {
                      cardClass = "border-rose-300 bg-rose-50 text-rose-900";
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() =>
                          setSelectedByQid((prev) => ({ ...prev, [item.id]: optIdx }))
                        }
                        className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition active:scale-[0.99] cursor-pointer ${cardClass}`}
                      >
                        <span>
                          <span className="mr-1.5 font-semibold">
                            {optionLabel(optIdx, item.medium)})
                          </span>
                          <MathText text={opt} />
                        </span>
                        {showFeedback && isCorrect && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        )}
                        {showFeedback && isChosen && !isCorrect && (
                          <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {showFeedback && item.explanation && (
                  <div className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                    <span className="font-semibold text-navy">Explanation:</span>{" "}
                    <MathText text={item.explanation} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
