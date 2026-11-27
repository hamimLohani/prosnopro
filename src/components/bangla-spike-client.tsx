"use client";

import { AlertCircle, CheckCircle2, FileUp, Loader2, Printer } from "lucide-react";
import { useState } from "react";
import { analyzeBanglaPdfText, type BanglaPdfAnalysis } from "@/lib/validation";

interface PagePreview {
  pageNumber: number;
  extractedText: string;
  analysis: BanglaPdfAnalysis;
  thumbnailDataUrl: string | null;
}

const SAMPLE_QUESTIONS = [
  {
    q: "১. বাংলা সাহিত্যের প্রাচীনতম নিদর্শন 'চর্যাপদ' কোন ছন্দে রচিত এবং এতে কোন ধরনের যুক্তবর্ণের (যেমন: ক্ষ, জ্ঞ, হ্ম, ন্ত্র) ব্যবহার লক্ষ্য করা যায়?",
    options: ["মাত্রাবৃত্ত ছন্দ", "স্বরবৃত্ত ছন্দ", "অক্ষরবৃত্ত ছন্দ", "পয়ার ছন্দ"],
    answer: "ক) মাত্রাবৃত্ত ছন্দ",
  },
  {
    q: "২. নিউটনের গতির দ্বিতীয় সূত্র $F = ma$ অনুযায়ী, $5\\text{ kg}$ ভরের একটি বস্তুর ওপর $20\\text{ N}$ বল প্রয়োগ করলে ত্বরণ কত হবে?",
    options: ["2 m/s²", "4 m/s²", "10 m/s²", "100 m/s²"],
    answer: "খ) 4 m/s²",
  },
  {
    q: "৩. Choose the word with valid complex Bengali conjuncts for print shaping verification: উজ্জ্বল, ব্রাহ্মণ, রাষ্ট্রীয়, ঐতিহ্য, বিজ্ঞান।",
    options: ["All conjuncts rendered crisply", "Ligatures broken", "Vowel signs shifted", "Needs test"],
    answer: "ক) All conjuncts rendered crisply",
  },
];

export function BanglaSpikeClient() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreviews([]);
    setFileName(file.name);
    setLoading(true);

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const buffer = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buffer }).promise;
      setPageCount(doc.numPages);

      const maxPagesToInspect = Math.min(doc.numPages, 3);
      const results: PagePreview[] = [];

      for (let pageNumber = 1; pageNumber <= maxPagesToInspect; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const extractedText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        const analysis = analyzeBanglaPdfText(extractedText);

        // Render page thumbnail in browser (for Vision OCR fallback on scanned/Bijoy PDFs)
        const viewport = page.getViewport({ scale: 1.1 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext("2d");

        let thumbnailDataUrl: string | null = null;
        if (context) {
          await page.render({
            canvas,
            canvasContext: context,
            viewport,
          }).promise;
          thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.72);
        }

        results.push({
          pageNumber,
          extractedText,
          analysis,
          thumbnailDataUrl,
        });
      }

      setPreviews(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to inspect PDF in browser.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Browser Print-to-PDF Verification */}
      <section className="space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-bold text-navy">1. Bangla Print-to-PDF Shaping Test</h2>
            <p className="text-sm text-slate-600">
              Click Print / Save as PDF to verify that Noto Sans Bengali shapes conjuncts (যুক্তবর্ণ)
              cleanly with zero server cost.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showAnswerKey}
                onChange={(e) => setShowAnswerKey(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-navy"
              />
              <span>Answer key mode</span>
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        <div className="print-only-sheet rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="border-b border-slate-300 pb-4 mb-5 flex items-baseline justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                ProsnoPro — নমুনা প্রশ্নপত্র (Sample Question Paper)
              </h3>
              <p className="text-sm text-slate-600">বিষয়: বাংলা ও পদার্থবিজ্ঞান • সময়: ৩০ মিনিট • পূর্ণমান: ৩</p>
            </div>
            <span className="font-mono text-xs text-slate-500">
              {showAnswerKey ? "ANSWER KEY" : "QUESTION PAPER"}
            </span>
          </div>

          <ol className="space-y-5 text-sm text-slate-900">
            {SAMPLE_QUESTIONS.map((item, idx) => (
              <li key={idx} className="space-y-2 break-inside-avoid">
                <p className="font-semibold leading-relaxed">{item.q}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 pl-4 text-slate-700">
                  <span>ক) {item.options[0]}</span>
                  <span>খ) {item.options[1]}</span>
                  <span>গ) {item.options[2]}</span>
                  <span>ঘ) {item.options[3]}</span>
                </div>
                {showAnswerKey && (
                  <p className="pl-4 text-xs font-semibold text-emerald-700">
                    সঠিক উত্তর: {item.answer}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 2. Client-Side pdf.js Inspector (0 bytes storage) */}
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">
            2. Zero-Storage Browser PDF Inspector (Unicode vs. Bijoy/Scanned)
          </h2>
          <p className="text-sm text-slate-600">
            Runs 100% in your browser via <code className="font-mono text-xs">pdfjs-dist</code>—the
            PDF never touches the server or Supabase Storage. Inspects up to the first 3 pages.
          </p>
        </div>

        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-navy hover:bg-slate-100/70 cursor-pointer">
          <FileUp className="h-6 w-6 text-navy" />
          <span className="text-sm font-semibold text-slate-800">
            {fileName ? `Selected: ${fileName}` : "Choose a local Bangla or English PDF to test"}
          </span>
          <span className="text-xs text-slate-500">Stays completely inside your browser</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload}
            className="hidden"
          />
        </label>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-navy" />
            <span>Extracting text &amp; rendering preview pages in browser...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {previews.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-medium text-slate-500">
              Total pages in PDF: {pageCount} (showing first {previews.length})
            </p>

            {previews.map((page) => (
              <div
                key={page.pageNumber}
                className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-3"
              >
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">Page {page.pageNumber}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        page.analysis.classification === "unicode-bangla" ||
                        page.analysis.classification === "english-or-numeric"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {page.analysis.classification}
                    </span>
                    <span className="text-xs text-slate-500">
                      Bengali Unicode: {Math.round(page.analysis.bengaliRatio * 100)}%
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-700">
                    {page.analysis.recommendation}
                  </p>

                  <pre className="max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs whitespace-pre-wrap text-slate-700 border border-slate-200">
                    {page.extractedText || "(No embedded text layer)"}
                  </pre>
                </div>

                {page.thumbnailDataUrl && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.thumbnailDataUrl}
                      alt={`Rendered page ${page.pageNumber}`}
                      className="max-h-48 w-auto rounded shadow-xs"
                    />
                    <span className="mt-1.5 text-[11px] text-slate-500">
                      Browser canvas image ready for Vision OCR
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
