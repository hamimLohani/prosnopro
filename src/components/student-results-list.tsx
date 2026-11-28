"use client";

import { ArrowRight, Clock, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";
import type { AttemptStatus, ExamMedium, ResultReleaseMode } from "@/lib/types";

export interface StudentHistoryItem {
  attempt_id: string;
  exam_id: string;
  exam_name: string;
  subject: string;
  medium: ExamMedium;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  result_release: ResultReleaseMode;
  show_answers: boolean;
  results_released: boolean;
  score: number | null;
  total_marks: number | null;
}

interface StudentResultsListProps {
  items: StudentHistoryItem[];
}

const RESULTS_PAGE_SIZE = 15;

export function StudentResultsList({ items }: StudentResultsListProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "in_progress">("all");
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === "in_progress" && item.status !== "in_progress") return false;
      if (statusFilter === "submitted" && item.status === "in_progress") return false;
      if (kw) {
        const hay = `${item.exam_name} ${item.subject}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [items, keyword, statusFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by exam name or subject..."
            className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(
            [
              { value: "all", label: "All" },
              { value: "submitted", label: "Submitted" },
              { value: "in_progress", label: "In Progress" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
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
          {t("আপনার সার্চ অনুযায়ী কোনো Result পাওয়া যায়নি।", "No matching results found.")}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, visibleCount).map((item) => {
            const pct =
              item.results_released &&
              item.score !== null &&
              item.total_marks &&
              Number(item.total_marks) > 0
                ? Math.round((Number(item.score) / Number(item.total_marks)) * 100)
                : null;

            return (
              <div
                key={item.attempt_id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{item.exam_name}</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {item.subject || "General"} • {item.medium === "bn" ? "বাংলা" : "English"} •{" "}
                    {item.submitted_at
                      ? `${t("Submit", "Submitted")}: ${new Date(item.submitted_at).toLocaleString()}`
                      : `${t("শুরু", "Started")}: ${new Date(item.started_at).toLocaleString()}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                  {item.status === "in_progress" ? (
                    <Link
                      href={`/student/exams/${item.exam_id}/take`}
                      className="inline-flex min-h-[40px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
                    >
                      <span>{t("Exam চালিয়ে যান", "Resume Exam")}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <>
                      {item.results_released && item.score !== null && item.total_marks !== null ? (
                        <div className="text-left sm:text-right">
                          <p className="text-base font-extrabold text-navy">
                            {item.score} / {item.total_marks}
                          </p>
                          {pct !== null && (
                            <p className="text-xs font-medium text-emerald-700">{pct}%</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{t("অপেক্ষমাণ", "Pending")}</span>
                        </span>
                      )}

                      <Link
                        href={`/student/results/${item.attempt_id}`}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {t("বিস্তারিত দেখুন", "View Details")}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length > visibleCount && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + RESULTS_PAGE_SIZE)}
                className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs sm:text-sm font-semibold text-navy hover:bg-slate-50 cursor-pointer"
              >
                {t(
                  `আরও দেখুন (${filtered.length - visibleCount}টি বাকি)`,
                  `Load more (${filtered.length - visibleCount} remaining)`,
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
