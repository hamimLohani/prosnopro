"use client";

import { Clock, HelpCircle, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ClassSelect } from "@/components/class-select";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";
import type { Exam, ExamStatus } from "@/lib/types";

interface TeacherExamListProps {
  exams: Exam[];
}

const EXAM_PAGE_SIZE = 20;

export function TeacherExamList({ exams }: TeacherExamListProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [keyword, setKeyword] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ExamStatus>("all");
  const [visibleCount, setVisibleCount] = useState(EXAM_PAGE_SIZE);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const cls = classFilter.trim().toLowerCase();

    return exams.filter((exam) => {
      if (statusFilter !== "all" && exam.status !== statusFilter) {
        return false;
      }
      if (cls && !(exam.class ?? "").toLowerCase().includes(cls)) {
        return false;
      }
      if (kw) {
        const hay = `${exam.name} ${exam.subject} ${exam.class ?? ""} ${exam.code}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [classFilter, exams, keyword, statusFilter]);

  if (exams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-2">
        <p className="text-base font-semibold text-slate-800">
          {t("এখনো কোনো Exam নেই", "No exams yet")}
        </p>
        <p className="text-sm text-slate-500">
          {t(
            "আপনার প্রথম MCQ পরীক্ষা তৈরি করতে উপরের “নতুন Exam তৈরি করুন” বাটনে ট্যাপ করুন।",
            "Tap “Create New Exam” above to create your first MCQ exam.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by exam name, subject, or code..."
              className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
          <ClassSelect
            value={classFilter}
            onChange={setClassFilter}
            allowCustom={false}
            placeholder="All Classes"
            searchPlaceholder="Search class..."
            buttonClassName="h-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { value: "all", label: "All" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
              { value: "closed", label: "Closed" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`min-h-[32px] rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                statusFilter === tab.value
                  ? "bg-navy text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {t("আপনার সার্চ অনুযায়ী কোনো Exam পাওয়া যায়নি।", "No matching exams found.")}
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {filtered.slice(0, visibleCount).map((exam) => (
              <div
                key={exam.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/teacher/exams/${exam.id}`}
                    className="text-base sm:text-lg font-bold text-slate-900 hover:text-navy hover:underline break-words"
                  >
                    {exam.name}
                  </Link>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      exam.status === "published"
                        ? "bg-emerald-100 text-emerald-800"
                        : exam.status === "closed"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {exam.status === "published"
                      ? "Published"
                      : exam.status === "closed"
                        ? "Closed"
                        : "Draft"}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-navy">
                    {exam.code}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {exam.class && (
                    <>
                      <span className="rounded bg-navy/10 px-2 py-0.5 font-medium text-navy">
                        {exam.class}
                      </span>
                    </>
                  )}
                  <span>{exam.subject || "General"}</span>
                  <span>•</span>
                  <span>{exam.medium === "bn" ? t("বাংলা", "Bangla") : "English"}</span>
                  <span className="inline-flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5" />
                    {t(`${exam.question_count}টি প্রশ্ন`, `${exam.question_count} Qs`)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {t(`${exam.duration_minutes} মিনিট`, `${exam.duration_minutes} min`)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 shrink-0">
                <Link
                  href={`/teacher/exams/${exam.id}/questions`}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t("প্রশ্নসমূহ", "Questions")}
                </Link>
                <Link
                  href={`/teacher/exams/${exam.id}`}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
                >
                  {t("Manage করুন →", "Manage →")}
                </Link>
              </div>
            </div>
          ))}
          </div>
          {filtered.length > visibleCount && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + EXAM_PAGE_SIZE)}
                className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs sm:text-sm font-semibold text-navy hover:bg-slate-50 cursor-pointer"
              >
                {t(
                  `আরও দেখুন (${filtered.length - visibleCount}টি বাকি)`,
                  `Load more (${filtered.length - visibleCount} remaining)`,
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
