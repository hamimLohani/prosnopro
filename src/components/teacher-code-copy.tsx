"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface TeacherCodeCopyProps {
  code: string;
  label?: string;
  copiedLabel?: string;
  includeStudentUrl?: boolean;
  studentPath?: string;
}

export function TeacherCodeCopy({
  code,
  label = "Code Copy করুন",
  copiedLabel = "Copy হয়েছে",
  includeStudentUrl = false,
  studentPath = "/student",
}: TeacherCodeCopyProps) {
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
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
