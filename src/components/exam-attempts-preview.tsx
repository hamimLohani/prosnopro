"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";
import { formatAttemptStatus } from "@/lib/mcq";
import type { AttemptStatus } from "@/lib/types";

export interface ExamAttemptPreviewRow {
  id: string;
  student_name: string;
  student_roll: string | null;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
}

interface ExamAttemptsPreviewProps {
  examId: string;
  attempts: ExamAttemptPreviewRow[];
}

const PREVIEW_PAGE_SIZE = 15;

export function ExamAttemptsPreview({ examId, attempts }: ExamAttemptsPreviewProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [keyword, setKeyword] = useState("");
  const [visibleCount, setVisibleCount] = useState(PREVIEW_PAGE_SIZE);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return attempts;
    return attempts.filter(
      (a) =>
        a.student_name.toLowerCase().includes(kw) ||
        (a.student_roll ?? "").toLowerCase().includes(kw),
    );
  }, [attempts, keyword]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-bold text-navy">
          {t(`Student-দের অংশগ্রহণ (${attempts.length})`, `Student Attempts (${attempts.length})`)}
        </h2>
        <Link
          href={`/teacher/exams/${examId}/results`}
          className="text-xs font-semibold text-navy hover:underline"
        >
          {t("সম্পূর্ণ Result ও Export →", "Full Results & Export →")}
        </Link>
      </div>

      {attempts.length === 0 ? (
        <p className="text-sm text-slate-500">
          {t(
            "এখনো কোনো Student এই Exam-এ অংশগ্রহণ করেনি।",
            "No students have joined this exam yet.",
          )}
        </p>
      ) : (
        <>
          {attempts.length > 5 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t(
                  "Student-এর নাম বা Roll/ID দিয়ে খুঁজুন...",
                  "Search by student name or Roll/ID...",
                )}
                className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              {t("কোনো Student-এর সাথে মিল পাওয়া যায়নি।", "No matching student attempts found.")}
            </p>
          ) : (
            <>
              {/* Mobile Attempt Cards */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {filtered.slice(0, visibleCount).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{a.student_name}</p>
                      <p className="text-xs text-slate-500">
                        {a.student_roll ? `Roll: ${a.student_roll}` : t("Roll নেই", "No roll")} •{" "}
                        {formatAttemptStatus(a.status, lang)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-bold text-navy">
                        {a.score !== null && a.total_marks !== null
                          ? `${a.score}/${a.total_marks}`
                          : t("চলমান", "In progress")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Attempts Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-2 pr-4">{t("শিক্ষার্থী", "Student")}</th>
                      <th className="py-2 pr-4">{t("রোল / আইডি", "Roll / ID")}</th>
                      <th className="py-2 pr-4">{t("অবস্থা", "Status")}</th>
                      <th className="py-2 pr-4">{t("স্কোর", "Score")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.slice(0, visibleCount).map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-4 font-medium text-slate-900">{a.student_name}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{a.student_roll ?? "—"}</td>
                        <td className="py-2.5 pr-4">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {formatAttemptStatus(a.status, lang)}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900">
                          {a.score !== null && a.total_marks !== null
                            ? `${a.score} / ${a.total_marks}`
                            : t("চলমান", "In progress")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.length > visibleCount && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PREVIEW_PAGE_SIZE)}
                    className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-navy hover:bg-slate-50 cursor-pointer"
                  >
                    {t(
                      `আরও দেখুন (${filtered.length - visibleCount}টি বাকি)`,
                      `Show more (${filtered.length - visibleCount} remaining)`,
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
