"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface TeacherCodeCopyProps {
  code: string;
}

export function TeacherCodeCopy({ code }: TeacherCodeCopyProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-amber" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? "Copied" : "Copy code"}</span>
    </button>
  );
}
