"use client";

import { Check, Copy, FilePlus2 } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/components/language-provider";
import type { DraftMcqQuestion } from "@/lib/ai/schema";
import { parseBulkMcqText } from "@/lib/bulk-mcq";
import { type AppLang, pickText } from "@/lib/i18n";
import { optionLabel } from "@/lib/mcq";
import type { ExamMedium } from "@/lib/types";

interface BulkPasteTabProps {
  medium: ExamMedium;
  optionCount: number;
  defaultMarks: number;
  subject?: string;
  classLevel?: string;
  onDraftsAdded: (drafts: DraftMcqQuestion[]) => void;
  onError: (msg: string) => void;
}

function buildBulkSample(optionCount: number, medium: ExamMedium, lang: AppLang): string {
  const bnOpts1 = ["চট্টগ্রাম", "ঢাকা", "খুলনা", "রাজশাহী", "সিলেট", "বরিশাল"];
  const enOpts1 = ["Chattogram", "Dhaka", "Khulna", "Rajshahi", "Sylhet", "Barishal"];
  const bnOpts2 = ["F = ma", "E = mc²", "V = IR", "PV = nRT", "p = mv", "W = Fs"];

  if (lang === "bn" || medium === "bn") {
    const q1Opts = Array.from(
      { length: optionCount },
      (_, i) =>
        `${optionLabel(i, medium)}) ${
          medium === "bn" ? (bnOpts1[i] ?? `বিকল্প ${i + 1}`) : (enOpts1[i] ?? `Option ${i + 1}`)
        }`,
    ).join("\n");
    const q2Opts = Array.from(
      { length: optionCount },
      (_, i) => `${optionLabel(i, medium)}) ${bnOpts2[i] ?? `সূত্র ${i + 1}`}`,
    ).join("\n");
    const ans1 = optionLabel(Math.min(1, optionCount - 1), medium);
    const ans2 = optionLabel(0, medium);

    if (lang === "bn") {
      return [
        `1. বাংলাদেশের রাজধানী কোথায়?\n${q1Opts}\nAns: ${ans1}\nEx: ঢাকা বাংলাদেশের রাজধানী।`,
        `2. নিউটনের গতির দ্বিতীয় সূত্র কোনটি?\n${q2Opts}\nAns: ${ans2}`,
      ].join("\n\n");
    }
  }

  const q1OptsEn = Array.from(
    { length: optionCount },
    (_, i) => `${optionLabel(i, medium)}) ${enOpts1[i] ?? `Option ${i + 1}`}`,
  ).join("\n");
  const q2OptsEn = Array.from(
    { length: optionCount },
    (_, i) => `${optionLabel(i, medium)}) ${bnOpts2[i] ?? `Formula ${i + 1}`}`,
  ).join("\n");
  return [
    `1. What is the capital of Bangladesh?\n${q1OptsEn}\nAns: ${optionLabel(Math.min(1, optionCount - 1), medium)}\nEx: Dhaka is the capital of Bangladesh.`,
    `2. Which is Newton's second law of motion?\n${q2OptsEn}\nAns: ${optionLabel(0, medium)}`,
  ].join("\n\n");
}

function buildBulkFormatPrompt({
  medium,
  optionCount,
  subject,
  classLevel,
  lang,
}: {
  medium: ExamMedium;
  optionCount: number;
  subject?: string;
  classLevel?: string;
  lang: AppLang;
}): string {
  const contextParts = [subject, classLevel].filter(Boolean).join(" • ");
  const targetLangBn = medium === "bn" ? "বাংলায় (UTF-8)" : "English-এ";
  const targetLangEn = medium === "bn" ? "Bangla (UTF-8 Bengali script)" : "English";

  if (lang === "bn") {
    const sampleOptions = Array.from(
      { length: optionCount },
      (_, i) => `${optionLabel(i, medium)}) বিকল্প ${i + 1}`,
    ).join("\n");
    const sampleAns = optionLabel(Math.min(1, optionCount - 1), medium);

    return [
      `[বিষয়/Topic লিখুন] বিষয়ের উপর ${targetLangBn} [প্রশ্নের সংখ্যা]টি মানসম্মত MCQ প্রশ্ন তৈরি করুন${contextParts ? ` (${contextParts})` : ""}।`,
      `প্রতিটি প্রশ্নে ঠিক ${optionCount}টি Option থাকতে হবে। Markdown বা Code block (***, \`\`\`) ছাড়া হুবহু নিচের ফরম্যাটে লিখুন এবং প্রতিটি প্রশ্নের মাঝে একটি ফাঁকা লাইন দিন (গণিতের সূত্রের জন্য $...$ ব্যবহার করুন):`,
      "",
      `1. এখানে প্রথম প্রশ্ন লিখুন?`,
      sampleOptions,
      `Ans: ${sampleAns}`,
      `Ex: সংক্ষিপ্ত ব্যাখ্যা (ঐচ্ছিক)।`,
    ].join("\n");
  }

  const sampleOptionsEn = Array.from(
    { length: optionCount },
    (_, i) => `${String.fromCharCode(65 + i)}) Option ${i + 1}`,
  ).join("\n");
  const sampleAnsEn = String.fromCharCode(65 + Math.min(1, optionCount - 1));

  return [
    `Create [NUMBER OF QUESTIONS] high-quality MCQ questions in ${targetLangEn} on [TOPIC / CHAPTERS]${contextParts ? ` (${contextParts})` : ""}.`,
    `Each question MUST have exactly ${optionCount} options. Return plain text in this EXACT format with no markdown bolding or code blocks, leaving one blank line between questions (use $...$ for math formulas):`,
    "",
    `1. Question text here?`,
    sampleOptionsEn,
    `Ans: ${sampleAnsEn}`,
    `Ex: Brief explanation (optional).`,
  ].join("\n");
}

export function BulkPasteTab({
  medium,
  optionCount,
  defaultMarks,
  subject,
  classLevel,
  onDraftsAdded,
  onError,
}: BulkPasteTabProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [bulkText, setBulkText] = useState("");
  const [bulkPromptCopied, setBulkPromptCopied] = useState(false);

  async function handleCopyBulkPrompt() {
    try {
      await navigator.clipboard.writeText(
        buildBulkFormatPrompt({ medium, optionCount, subject, classLevel, lang }),
      );
      setBulkPromptCopied(true);
      setTimeout(() => setBulkPromptCopied(false), 2000);
    } catch {
      onError(
        t(
          "Clipboard-এ Copy করা যায়নি। অনুগ্রহ করে Browser permission চেক করুন।",
          "Could not copy to clipboard. Please check browser permissions.",
        ),
      );
    }
  }

  function handleParse() {
    const parsed = parseBulkMcqText(bulkText, optionCount, defaultMarks);
    if (parsed.length === 0) {
      onError(
        t(
          `কোনো বৈধ ${optionCount}-option প্রশ্ন পাওয়া যায়নি। প্রতিটি প্রশ্নের নিচে ${optionCount}টি Option ও মাঝে একটি ফাঁকা লাইন আছে কি না দেখুন।`,
          `No valid ${optionCount}-option questions found. Make sure each question has ${optionCount} options and a blank line between questions.`,
        ),
      );
      return;
    }
    onDraftsAdded(parsed);
    setBulkText("");
  }

  const placeholderOpts = Array.from(
    { length: optionCount },
    (_, i) =>
      `${optionLabel(i, medium)}) ${t(`বিকল্প ${i + 1}`, `Option ${i + 1}`)}`,
  ).join("\n");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
        <div>
          <h2 className="text-base font-bold text-navy">
            {t(
              "Bulk Paste (কোনো AI Key ছাড়াই একসাথে প্রশ্ন যোগ করুন)",
              "Bulk Paste (Add multiple questions without an AI key)",
            )}
          </h2>
          <p className="text-xs text-slate-500">
            {t(
              `Word, Notepad বা WhatsApp থেকে ${optionCount}-option MCQ কপি-পেস্ট করুন। প্রতিটি প্রশ্নের মাঝে একটি ফাঁকা লাইন দিন (ব্যাখ্যার জন্য ঐচ্ছিক`,
              `Copy and paste ${optionCount}-option MCQs from Word, Notepad, or WhatsApp. Leave a blank line between questions (optional`,
            )}{" "}
            <span className="font-mono font-semibold text-slate-700">Ex: ...</span>
            {t(" লিখুন)।", " for explanations).")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleCopyBulkPrompt()}
          className="inline-flex min-h-[40px] sm:min-h-[38px] w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50 active:scale-[0.99] cursor-pointer"
        >
          {bulkPromptCopied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {bulkPromptCopied
              ? t("ফরম্যাট Prompt কপি হয়েছে", "Format Prompt Copied")
              : t("ফরম্যাট Prompt কপি করুন", "Copy Format Prompt")}
          </span>
        </button>
      </div>

      <textarea
        rows={8}
        value={bulkText}
        onChange={(e) => setBulkText(e.target.value)}
        placeholder={`1. ${t("এখানে প্রশ্ন লিখুন?", "Question text here?")}\n${placeholderOpts}\nAns: ${optionLabel(Math.min(1, optionCount - 1), medium)}\nEx: ${t("সংক্ষিপ্ত ব্যাখ্যা।", "Brief explanation.")}`}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setBulkText(buildBulkSample(optionCount, medium, lang))}
          className="min-h-[38px] text-xs font-semibold text-navy hover:underline cursor-pointer"
        >
          {t("উদাহরণ বসান (Sample)", "Insert Sample")}
        </button>

        <button
          type="button"
          onClick={handleParse}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong cursor-pointer"
        >
          <FilePlus2 className="h-4 w-4" />
          <span>{t("Draft তৈরি করুন", "Create Drafts")}</span>
        </button>
      </div>
    </div>
  );
}
