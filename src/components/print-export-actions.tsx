"use client";

import { Download, FileSpreadsheet, FileText, Loader2, Printer } from "lucide-react";
import { useState } from "react";
import { exportQuestionsDocx, exportResultsCsv, exportResultsExcel } from "@/lib/exports";
import type { AttemptDetail, Exam, Question } from "@/lib/types";

interface PrintExportActionsProps {
  exam: Exam;
  questions: Question[];
  attempts: AttemptDetail[];
}

export function PrintExportActions({ exam, questions, attempts }: PrintExportActionsProps) {
  const [busy, setBusy] = useState<string | null>(null);

  async function handleExcel() {
    setBusy("xlsx");
    try {
      await exportResultsExcel(exam, attempts);
    } finally {
      setBusy(null);
    }
  }

  async function handleDocx(includeAnswers: boolean) {
    setBusy(includeAnswers ? "docx-key" : "docx-paper");
    try {
      await exportQuestionsDocx(exam, questions, includeAnswers);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
      <button
        type="button"
        onClick={() => exportResultsCsv(exam, attempts)}
        className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>CSV (Excel)</span>
      </button>

      <button
        type="button"
        disabled={busy !== null}
        onClick={handleExcel}
        className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
      >
        {busy === "xlsx" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        ) : (
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
        )}
        <span>Excel (.xlsx)</span>
      </button>

      <button
        type="button"
        disabled={busy !== null}
        onClick={() => handleDocx(false)}
        className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
      >
        {busy === "docx-paper" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        ) : (
          <FileText className="h-3.5 w-3.5 text-navy shrink-0" />
        )}
        <span>Paper (.docx)</span>
      </button>

      <button
        type="button"
        disabled={busy !== null}
        onClick={() => handleDocx(true)}
        className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
      >
        {busy === "docx-key" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        ) : (
          <FileText className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
        )}
        <span>Key (.docx)</span>
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="col-span-2 sm:col-span-1 inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-strong cursor-pointer"
      >
        <Printer className="h-4 w-4 shrink-0" />
        <span>Print / Save PDF</span>
      </button>
    </div>
  );
}
