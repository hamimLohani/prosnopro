"use client";

import { Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ClassSelect } from "@/components/class-select";
import { useLang } from "@/components/language-provider";
import { MathText } from "@/components/math-text";
import { SearchableSubjectSelect } from "@/components/searchable-subject-select";
import { pickText } from "@/lib/i18n";
import type { ExamMedium, QuestionBankItem } from "@/lib/types";

interface BankImportTabProps {
  bankItems: QuestionBankItem[];
  examMedium: ExamMedium;
  optionCount: number;
  importingBank: boolean;
  onImport: (selectedIds: string[], onDone: () => void) => void;
}

export function BankImportTab({
  bankItems,
  examMedium,
  optionCount,
  importingBank,
  onImport,
}: BankImportTabProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [bankKeyword, setBankKeyword] = useState("");
  const [bankSubject, setBankSubject] = useState("");
  const [bankClass, setBankClass] = useState("");
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);

  const filteredBank = useMemo(() => {
    const kw = bankKeyword.trim().toLowerCase();
    const subj = bankSubject.trim().toLowerCase();
    const cls = bankClass.trim().toLowerCase();
    return bankItems.filter((item) => {
      if (item.medium !== examMedium) return false;
      if (item.options.length !== optionCount) return false;
      if (subj && !item.subject.toLowerCase().includes(subj)) return false;
      if (cls && !item.class.toLowerCase().includes(cls)) return false;
      if (kw) {
        const hay = `${item.text} ${item.subject} ${item.class} ${item.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [bankClass, bankItems, bankKeyword, bankSubject, examMedium, optionCount]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-navy">
            {t("Question Bank থেকে যোগ করুন", "Import from Question Bank")}
          </h2>
          <p className="text-xs text-slate-500">
            {t(
              `আপনার ও Shared Bank-এর ${examMedium === "bn" ? "বাংলা" : "English"} ${optionCount}-option প্রশ্ন দেখানো হচ্ছে। নির্বাচিত প্রশ্নের কপি এই Exam-এ যুক্ত হবে।`,
              `Showing ${examMedium === "bn" ? "Bangla" : "English"} ${optionCount}-option questions from your bank and shared bank. Selected questions will be copied into this exam.`,
            )}
          </p>
        </div>
        <Link href="/teacher/bank" className="text-xs font-semibold text-navy hover:underline">
          {t("Question Bank পরিচালনা →", "Manage Question Bank →")}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 sm:top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={bankKeyword}
            onChange={(e) => setBankKeyword(e.target.value)}
            placeholder={t("কীওয়ার্ড বা Tag দিয়ে খুঁজুন...", "Search keyword or tag...")}
            className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-base sm:text-sm"
          />
        </div>
        <SearchableSubjectSelect
          value={bankSubject}
          onChange={setBankSubject}
          allowCustom={false}
          placeholder="All Subjects"
          searchPlaceholder="Search subject..."
        />
        <ClassSelect
          value={bankClass}
          onChange={setBankClass}
          allowCustom={false}
          placeholder="All Classes"
          searchPlaceholder="Search class..."
        />
      </div>

      {filteredBank.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
          {t(
            `আপনার Question Bank-এ মিলে যায় এমন ${optionCount}-option ${examMedium === "bn" ? "বাংলা" : "English"} প্রশ্ন পাওয়া যায়নি।`,
            `No matching ${examMedium === "bn" ? "Bangla" : "English"} ${optionCount}-option questions found in the Question Bank.`,
          )}
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {filteredBank.map((b) => {
            const checked = selectedBankIds.includes(b.id);
            return (
              <label
                key={b.id}
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${
                  checked ? "border-navy bg-navy/5" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setSelectedBankIds((prev) =>
                      e.target.checked ? [...prev, b.id] : prev.filter((id) => id !== b.id),
                    );
                  }}
                  className="mt-0.5 h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
                />
                <div className="min-w-0 space-y-1 text-xs">
                  <p className="font-semibold text-slate-900 break-words">
                    <MathText text={b.text} />
                  </p>
                  <p className="text-slate-500">
                    {b.subject || "General"} {b.class ? `• ${b.class}` : ""} •{" "}
                    {b.visibility === "shared"
                      ? t("Shared", "Shared")
                      : t("Private", "Private")}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={selectedBankIds.length === 0 || importingBank}
          onClick={() => onImport(selectedBankIds, () => setSelectedBankIds([]))}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-50 cursor-pointer"
        >
          {importingBank ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span>
            {t(
              `নির্বাচিত (${selectedBankIds.length}টি) যোগ করুন`,
              `Add Selected (${selectedBankIds.length})`,
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
