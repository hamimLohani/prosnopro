"use client";

import { formatTimeTaken } from "@/lib/analytics";
import { optionLabel } from "@/lib/mcq";
import type { AttemptDetail, Exam, Question } from "@/lib/types";

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "exam"
  );
}

function csvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportResultsCsv(exam: Exam, attempts: AttemptDetail[]) {
  const header = [
    "Name",
    "Roll / ID",
    "Status",
    "Score",
    "Total Marks",
    "Percentage",
    "Time Taken",
    "Submitted At",
    "Tab Switches",
    "Blurs",
    "Copy Attempts",
    "Away Seconds",
  ];

  const rows = attempts.map((a) => {
    const pct =
      a.score !== null && a.total_marks && Number(a.total_marks) > 0
        ? `${((Number(a.score) / Number(a.total_marks)) * 100).toFixed(1)}%`
        : "";
    const v = a.violation_counts ?? {
      tab_switches: 0,
      blurs: 0,
      copy_attempts: 0,
      away_seconds: 0,
    };

    return [
      a.student_name,
      a.student_roll ?? "",
      a.status,
      a.score ?? "",
      a.total_marks ?? "",
      pct,
      formatTimeTaken(a.started_at, a.submitted_at),
      a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "",
      v.tab_switches ?? 0,
      v.blurs ?? 0,
      v.copy_attempts ?? 0,
      v.away_seconds ?? 0,
    ]
      .map(csvCell)
      .join(",");
  });

  // Prefix UTF-8 BOM so Microsoft Excel renders Bangla text cleanly
  const content = `\uFEFF${header.map(csvCell).join(",")}\r\n${rows.join("\r\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${safeSlug(exam.name)}-results.csv`);
}

export async function exportResultsExcel(exam: Exam, attempts: AttemptDetail[]) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const headerRow = [
    { value: "Name", fontWeight: "bold" as const },
    { value: "Roll / ID", fontWeight: "bold" as const },
    { value: "Status", fontWeight: "bold" as const },
    { value: "Score", fontWeight: "bold" as const },
    { value: "Total Marks", fontWeight: "bold" as const },
    { value: "Percentage", fontWeight: "bold" as const },
    { value: "Time Taken", fontWeight: "bold" as const },
    { value: "Submitted At", fontWeight: "bold" as const },
    { value: "Tab Switches", fontWeight: "bold" as const },
    { value: "Away Seconds", fontWeight: "bold" as const },
  ];

  const dataRows = attempts.map((a) => {
    const pct =
      a.score !== null && a.total_marks && Number(a.total_marks) > 0
        ? Number(((Number(a.score) / Number(a.total_marks)) * 100).toFixed(1))
        : null;
    const v = a.violation_counts ?? { tab_switches: 0, away_seconds: 0 };

    return [
      a.student_name,
      a.student_roll ?? "",
      a.status,
      a.score !== null ? Number(a.score) : null,
      a.total_marks !== null ? Number(a.total_marks) : null,
      pct !== null ? `${pct}%` : "",
      formatTimeTaken(a.started_at, a.submitted_at),
      a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "",
      Number(v.tab_switches ?? 0),
      Number(v.away_seconds ?? 0),
    ];
  });

  const result = await writeXlsxFile([headerRow, ...dataRows], {
    sheet: "Results",
    columns: [
      { width: 24 },
      { width: 14 },
      { width: 16 },
      { width: 10 },
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 22 },
      { width: 14 },
      { width: 14 },
    ],
  });

  await result.toFile(`${safeSlug(exam.name)}-results.xlsx`);
}

export async function exportQuestionsDocx(
  exam: Exam,
  questions: Question[],
  includeAnswers: boolean,
) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const totalMarks = questions.reduce((sum, q) => sum + Number(q.marks), 0);

  const children = [
    new Paragraph({
      text: exam.name,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${exam.class ? `${exam.class} • ` : ""}${exam.subject || "General"} • ${exam.medium === "bn" ? "Bangla" : "English"} • Duration: ${exam.duration_minutes} min • Total Marks: ${totalMarks}`,
          italics: true,
        }),
      ],
      spacing: { after: 240 },
    }),
  ];

  if (exam.instructions && !includeAnswers) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Instructions: ", bold: true }),
          new TextRun({ text: exam.instructions }),
        ],
        spacing: { after: 240 },
      }),
    );
  }

  questions.forEach((q, idx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. `, bold: true }),
          new TextRun({ text: `${q.text} [${q.marks}]`, bold: true }),
        ],
        spacing: { before: 180, after: 80 },
      }),
    );

    q.options.forEach((opt, optIdx) => {
      const isCorrect = includeAnswers && optIdx === q.correct_index;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `    ${optionLabel(optIdx, exam.medium)}) ${opt}${isCorrect ? "  ✓" : ""}`,
              bold: isCorrect,
            }),
          ],
          spacing: { after: 40 },
        }),
      );
    });

    if (includeAnswers) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `    Answer: ${optionLabel(q.correct_index, exam.medium)}`,
              bold: true,
            }),
            ...(q.explanation
              ? [new TextRun({ text: ` — ${q.explanation}`, italics: true })]
              : []),
          ],
          spacing: { after: 120 },
        }),
      );
    }
  });

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Prepared by ProsnoPro",
          italics: true,
          color: "64748B",
        }),
      ],
      spacing: { before: 360 },
    }),
  );

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const suffix = includeAnswers ? "answer-key" : "question-paper";
  triggerDownload(blob, `${safeSlug(exam.name)}-${suffix}.docx`);
}
