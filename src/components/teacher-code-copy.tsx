"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";

interface TeacherCodeCopyProps {
  code: string;
  label?: string;
  copiedLabel?: string;
  includeStudentUrl?: boolean;
  studentPath?: string;
}

export function TeacherCodeCopy({
  code,
  label,
  copiedLabel,
  includeStudentUrl = false,
  studentPath = "/student",
}: TeacherCodeCopyProps) {
  const { lang } = useLang();
  const resolvedLabel = label ?? pickText(lang, "Code Copy করুন", "Copy Code");
  const resolvedCopiedLabel = copiedLabel ?? pickText(lang, "Copy হয়েছে", "Copied");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const text = includeStudentUrl
        ? code.replace("__STUDENT_URL__", `${window.location.origin}${studentPath}`)
        : code;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 active:scale-95 cursor-pointer"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-amber" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? resolvedCopiedLabel : resolvedLabel}</span>
    </button>
  );
}
