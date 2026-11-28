import type { DraftMcqQuestion } from "./schema.ts";
import { type AppLang, pickText } from "../i18n.ts";
import type { ExamMedium } from "../types.ts";
import { analyzeBanglaPdfText } from "../validation.ts";

export interface GenerateAiDraftParams {
  examId?: string;
  medium?: ExamMedium;
  classLevel: string;
  subject: string;
  requestedCount: number;
  notes: string;
  aiProvider: string | null;
  lang: AppLang;
  onProgress: (msg: string | null) => void;
  onBatchDrafts: (drafts: DraftMcqQuestion[]) => void;
}

export async function generateAiDraftBatches({
  examId,
  medium,
  classLevel,
  subject,
  requestedCount,
  notes,
  aiProvider,
  lang,
  onProgress,
  onBatchDrafts,
}: GenerateAiDraftParams): Promise<{ ok: true; total: number; message: string } | { ok: false; error: string }> {
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const requestedTotal = Math.min(100, Math.max(1, Math.floor(requestedCount || 5)));
  const batchSize = 20;
  const batches: number[] = [];
  for (let left = requestedTotal; left > 0; left -= batchSize) {
    batches.push(Math.min(batchSize, left));
  }

  let generatedTotal = 0;
  const seenStems: string[] = [];

  try {
    for (let i = 0; i < batches.length; i += 1) {
      const count = batches[i];
      onProgress(
        batches.length > 1
          ? t(
              `ব্যাচ ${i + 1}/${batches.length} তৈরি হচ্ছে (${generatedTotal}/${requestedTotal})...`,
              `Generating batch ${i + 1} of ${batches.length} (${generatedTotal}/${requestedTotal})...`,
            )
          : t("Draft তৈরি হচ্ছে...", "Generating drafts..."),
      );

      const avoidNote =
        seenStems.length > 0
          ? `\n\nDo NOT repeat these already-generated questions:\n${seenStems
              .slice(-25)
              .map((s) => `- ${s}`)
              .join("\n")}`
          : "";

      const res = await fetch("/api/teacher/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          medium,
          classLevel: classLevel.trim(),
          subject: subject.trim(),
          count,
          notes: `${notes.trim()}${avoidNote}`,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        drafts?: DraftMcqQuestion[];
        message?: string;
      };

      if (!res.ok || !data.ok || !data.drafts) {
        const baseErr = data.message ?? t("AI থেকে প্রশ্ন তৈরি করা যায়নি।", "AI generation failed.");
        return {
          ok: false,
          error:
            generatedTotal > 0
              ? t(
                  `${generatedTotal}টি Draft তৈরির পর থেমে গেছে: ${baseErr}`,
                  `Stopped after generating ${generatedTotal} drafts: ${baseErr}`,
                )
              : baseErr,
        };
      }

      generatedTotal += data.drafts.length;
      seenStems.push(...data.drafts.map((d) => d.text.slice(0, 80)));
      onBatchDrafts(data.drafts);
    }

    return {
      ok: true,
      total: generatedTotal,
      message: t(
        `${generatedTotal}টি Draft তৈরি হয়েছে (${aiProvider ?? "AI"})। নিচে যাচাই করে Save করুন।`,
        `Generated ${generatedTotal} draft question(s) using your ${aiProvider ?? "AI"} key. Review and confirm answers below before saving.`,
      ),
    };
  } catch {
    return {
      ok: false,
      error:
        generatedTotal > 0
          ? t(
              `${generatedTotal}টি Draft তৈরির পর Network বিচ্ছিন্ন হয়েছে।`,
              `Network interrupted after generating ${generatedTotal} drafts.`,
            )
          : t(
              "AI সার্ভারে সংযোগ করতে Network সমস্যা হয়েছে।",
              "Network error while calling your AI provider.",
            ),
    };
  } finally {
    onProgress(null);
  }
}

export interface ImportPdfDraftParams {
  file: File;
  examId?: string;
  medium?: ExamMedium;
  lang: AppLang;
  onProgress: (msg: string | null) => void;
}

export async function importPdfDraftsFromFile({
  file,
  examId,
  medium,
  lang,
  onProgress,
}: ImportPdfDraftParams): Promise<
  { ok: true; drafts: DraftMcqQuestion[]; message: string } | { ok: false; error: string }
> {
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  if (file.size > 10 * 1024 * 1024) {
    return {
      ok: false,
      error: t("PDF ফাইল সর্বোচ্চ ১০ MB বা তার ছোট হতে হবে।", "PDF file must be 10 MB or smaller."),
    };
  }

  onProgress(
    t(
      "Browser-এ PDF পড়া হচ্ছে (Server-এ কোনো ফাইল Save হচ্ছে না)...",
      "Reading PDF in browser (0 bytes stored on server)...",
    ),
  );

  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    const pagesToProcess = Math.min(doc.numPages, 10);

    const textPages: string[] = [];
    const visionImages: string[] = [];

    for (let p = 1; p <= pagesToProcess; p += 1) {
      onProgress(
        t(`পৃষ্ঠা ${p}/${pagesToProcess} পরীক্ষা করা হচ্ছে...`, `Inspecting page ${p} of ${pagesToProcess}...`),
      );
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const extracted = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      const analysis = analyzeBanglaPdfText(extracted);
      if (
        analysis.classification === "unicode-bangla" ||
        analysis.classification === "english-or-numeric"
      ) {
        textPages.push(`[Page ${p}]\n${extracted}`);
      } else {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          visionImages.push(canvas.toDataURL("image/jpeg", 0.78));
        }
      }
    }

    const collected: DraftMcqQuestion[] = [];

    if (textPages.length > 0) {
      onProgress(
        t(
          `${textPages.length}টি পৃষ্ঠার Unicode টেক্সট বিশ্লেষণ করা হচ্ছে...`,
          `Parsing ${textPages.length} Unicode text page(s) with your AI key...`,
        ),
      );
      const res = await fetch("/api/teacher/ai/import-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          medium,
          extractedText: textPages.join("\n\n"),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        drafts?: DraftMcqQuestion[];
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? t("PDF টেক্সট পড়া যায়নি।", "Failed to parse PDF text."));
      }
      collected.push(...(data.drafts ?? []));
    }

    for (let i = 0; i < visionImages.length; i += 2) {
      const batch = visionImages.slice(i, i + 2);
      const batchNum = Math.floor(i / 2) + 1;
      const batchTotal = Math.ceil(visionImages.length / 2);
      onProgress(
        t(
          `Image OCR স্ক্যান চলছে (${batchNum}/${batchTotal})...`,
          `OCR scanning image batch ${batchNum} of ${batchTotal}...`,
        ),
      );
      const res = await fetch("/api/teacher/ai/import-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          medium,
          imageDataUrls: batch,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        drafts?: DraftMcqQuestion[];
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(
          data.message ??
            t("Scanned পৃষ্ঠা থেকে প্রশ্ন পাওয়া যায়নি।", "Failed to extract questions from scanned PDF page."),
        );
      }
      collected.push(...(data.drafts ?? []));
    }

    if (collected.length === 0) {
      return {
        ok: false,
        error: t("উক্ত PDF থেকে কোনো MCQ পাওয়া যায়নি।", "No MCQs were extracted from that PDF."),
      };
    }

    return {
      ok: true,
      drafts: collected,
      message: t(
        `${pagesToProcess}টি পৃষ্ঠা থেকে ${collected.length}টি Draft পাওয়া গেছে। নিচে যাচাই করে Save করুন।`,
        `Extracted ${collected.length} draft question(s) from ${pagesToProcess} page(s). Review and confirm answers below before saving.`,
      ),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : t("PDF Import করা যায়নি।", "PDF import failed."),
    };
  } finally {
    onProgress(null);
  }
}
