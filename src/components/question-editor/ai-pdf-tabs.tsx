"use client";

import { AlertTriangle, FileUp, KeyRound, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { ClassSelect } from "@/components/class-select";
import { useLang } from "@/components/language-provider";
import { SearchableSubjectSelect } from "@/components/searchable-subject-select";
import { pickText } from "@/lib/i18n";
import type { ExamMedium } from "@/lib/types";

interface AiKeyMissingBannerProps {
  returnToPath: string;
  mode: "ai" | "pdf";
}

function AiKeyMissingBanner({ returnToPath, mode }: AiKeyMissingBannerProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const returnUrl = `/teacher/settings?returnTo=${encodeURIComponent(returnToPath)}#ai-key`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5 text-sm text-amber-950">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">
            {mode === "ai"
              ? t("প্রথমে আপনার নিজস্ব AI API Key যোগ করুন", "Add Your Own AI API Key First")
              : t("PDF Import করতে আপনার AI API Key যোগ করুন", "Add Your AI API Key to Import PDFs")}
          </p>
          <p className="text-xs text-amber-900">
            {mode === "ai"
              ? t(
                  "প্রতিটি Teacher Settings-এ গিয়ে নিজস্ব Gemini (Free tier), Groq (Free tier), OpenAI বা Anthropic Key সংরক্ষণ করতে পারেন।",
                  "Teachers can save their own Gemini (Free tier), Groq (Free tier), OpenAI, or Anthropic API key in Settings.",
                )
              : t(
                  "PDF-এর পৃষ্ঠা আপনার Browser-এ প্রক্রিয়াজাত হয়ে সরাসরি আপনার Key দিয়ে স্ক্যান হয় (Gemini Free tier বাংলা লেখা ও Scanned/Bijoy PDF সাপোর্ট করে)।",
                  "PDF pages are processed in your browser and scanned directly using your AI key (Gemini free tier supports both Bangla text and scanned PDFs).",
                )}
          </p>
        </div>
      </div>
      <Link
        href={returnUrl}
        className="inline-flex min-h-[42px] w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
      >
        <KeyRound className="h-3.5 w-3.5" />
        <span>
          {mode === "ai"
            ? t("Settings-এ API Key যোগ করুন", "Add API Key in Settings")
            : t("API Key যোগ করুন", "Add API Key")}
        </span>
      </Link>
    </div>
  );
}

interface AiGeneratorTabProps {
  returnToPath: string;
  medium: ExamMedium;
  optionCount: number;
  defaultMarks: number;
  hasAiKey: boolean;
  aiProvider: string | null;
  aiClassLevel: string;
  aiSubject: string;
  aiCount: string;
  aiNotes: string;
  aiGenerating: boolean;
  aiProgress: string | null;
  onClassChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onCountChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onGenerate: (e: React.FormEvent) => void;
}

export function AiGeneratorTab({
  returnToPath,
  medium,
  optionCount,
  defaultMarks,
  hasAiKey,
  aiProvider,
  aiClassLevel,
  aiSubject,
  aiCount,
  aiNotes,
  aiGenerating,
  aiProgress,
  onClassChange,
  onSubjectChange,
  onCountChange,
  onNotesChange,
  onGenerate,
}: AiGeneratorTabProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  if (!hasAiKey) {
    return <AiKeyMissingBanner returnToPath={returnToPath} mode="ai" />;
  }

  return (
    <form onSubmit={onGenerate} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-navy">
            {t(
              `আপনার ${aiProvider?.toUpperCase()} Key দিয়ে MCQ Draft তৈরি করুন`,
              `Draft MCQs Using Your ${aiProvider?.toUpperCase()} Key`,
            )}
          </h2>
          <p className="text-xs text-slate-500">
            {t(
              `সেটিংস: ${medium === "bn" ? "বাংলা" : "English"} • ${optionCount}টি Option • প্রতিটি ${defaultMarks} নম্বর`,
              `Settings: ${medium === "bn" ? "Bangla" : "English"} • ${optionCount} options • ${defaultMarks} mark(s) each`,
            )}
          </p>
        </div>
        <Link
          href={`/teacher/settings?returnTo=${encodeURIComponent(returnToPath)}#ai-key`}
          className="text-xs font-semibold text-navy hover:underline"
        >
          {t("API Key পরিবর্তন করুন", "Change API Key")}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="ai-class" className="block text-sm font-medium text-slate-700">
            {t("Class / Level (শ্রেণি / লেভেল)", "Class / Level")}
          </label>
          <ClassSelect id="ai-class" value={aiClassLevel} onChange={onClassChange} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ai-subj" className="block text-sm font-medium text-slate-700">
            {t("Subject (বিষয়)", "Subject")}
          </label>
          <SearchableSubjectSelect
            id="ai-subj"
            value={aiSubject}
            onChange={onSubjectChange}
            placeholder={t("বিষয় নির্বাচন করুন", "Select Subject")}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ai-count" className="block text-sm font-medium text-slate-700">
            {t("কতটি প্রশ্ন তৈরি হবে (সর্বোচ্চ ১০০)", "Questions to Generate (max 100)")}
          </label>
          <input
            id="ai-count"
            type="number"
            min={1}
            max={100}
            value={aiCount}
            onChange={(e) => onCountChange(e.target.value)}
            className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="ai-notes" className="block text-sm font-medium text-slate-700">
            {t("অধ্যায়, সিলেবাস বা নির্দেশনা (Prompt)", "Chapters, Syllabus, or Prompt")}
          </label>
          <button
            type="button"
            onClick={() =>
              onNotesChange(
                `Create ${aiCount || "10"} MCQ questions on chapters 1, 2 according to the syllabus. Difficulty: moderate.`,
              )
            }
            className="inline-flex min-h-[36px] sm:min-h-[30px] items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-navy hover:bg-navy/5 active:scale-95 transition cursor-pointer"
          >
            {t("Sample Prompt ব্যবহার করুন", "Use Sample Prompt")}
          </button>
        </div>

        <textarea
          id="ai-notes"
          rows={3}
          required
          value={aiNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Create <number> MCQ questions on chapters/topics <list>. Difficulty: <easy/medium/moderate/hard>."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={aiGenerating}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {aiGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-amber" />
          )}
          <span>
            {aiGenerating
              ? (aiProgress ?? t("Draft তৈরি হচ্ছে...", "Generating drafts..."))
              : t("Draft তৈরি করুন", "Generate Drafts")}
          </span>
        </button>
      </div>
    </form>
  );
}

interface PdfImportTabProps {
  returnToPath: string;
  hasAiKey: boolean;
  aiProvider: string | null;
  pdfImporting: boolean;
  pdfProgress: string | null;
  onPdfSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PdfImportTab({
  returnToPath,
  hasAiKey,
  aiProvider,
  pdfImporting,
  pdfProgress,
  onPdfSelect,
}: PdfImportTabProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  if (!hasAiKey) {
    return <AiKeyMissingBanner returnToPath={returnToPath} mode="pdf" />;
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-navy">
          {t(
            "Zero-Storage PDF Import (সর্বোচ্চ ১০ পৃষ্ঠা / ১০ MB)",
            "Zero-Storage PDF Import (Max 10 pages / 10 MB)",
          )}
        </h2>
        <p className="text-xs text-slate-600">
          {t(
            `Unicode বাংলা/English PDF সরাসরি Text হিসেবে এবং Scanned বা Bijoy PDF Image হিসেবে আপনার ${aiProvider?.toUpperCase()} Key দিয়ে পড়া হয়। কোনো PDF Server-এ Save থাকে না।`,
            `Unicode PDFs are parsed as text and scanned/legacy PDFs are read as images using your ${aiProvider?.toUpperCase()} key. Zero PDFs are stored on our server.`,
          )}
        </p>
      </div>

      <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 sm:p-6 text-center hover:border-navy hover:bg-slate-100/70 cursor-pointer">
        <FileUp className="h-6 w-6 text-navy" />
        <span className="text-sm font-semibold text-slate-800">
          {pdfImporting
            ? (pdfProgress ?? t("PDF প্রসেস হচ্ছে...", "Processing PDF..."))
            : t("প্রশ্নের PDF ফাইল বাছাই করুন", "Choose a Question PDF File")}
        </span>
        <span className="text-xs text-slate-500">
          {t(
            "Save করার আগে সব Draft আপনি যাচাই করতে পারবেন",
            "You can review and edit all drafts before saving",
          )}
        </span>
        <input
          type="file"
          accept="application/pdf"
          disabled={pdfImporting}
          onChange={onPdfSelect}
          className="hidden"
        />
      </label>
    </div>
  );
}
