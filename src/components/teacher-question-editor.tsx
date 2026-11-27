"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  FileUp,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MathText } from "@/components/math-text";
import type { DraftMcqQuestion } from "@/lib/ai/schema";
import { createClient } from "@/lib/supabase/client";
import type { Exam, Question, QuestionBankItem } from "@/lib/types";
import { analyzeBanglaPdfText } from "@/lib/validation";

interface TeacherQuestionEditorProps {
  exam: Exam;
  initialQuestions: Question[];
  initialBankItems: QuestionBankItem[];
  hasAttempts: boolean;
  hasAiKey: boolean;
  aiProvider: string | null;
}

type SourceTab = "manual" | "bank" | "ai" | "pdf";

function optionLabel(index: number, medium: "bn" | "en"): string {
  if (medium === "bn") {
    return ["ক", "খ", "গ", "ঘ", "ঙ", "চ"][index] ?? String(index + 1);
  }
  return String.fromCharCode(65 + index);
}

export function TeacherQuestionEditor({
  exam,
  initialQuestions,
  initialBankItems,
  hasAttempts,
  hasAiKey,
  aiProvider,
}: TeacherQuestionEditorProps) {
  const router = useRouter();
  const optionCount = exam.options_per_question;

  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [activeTab, setActiveTab] = useState<SourceTab>("manual");

  // Question Bank import state
  const [bankKeyword, setBankKeyword] = useState("");
  const [bankSubject, setBankSubject] = useState("");
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [importingBank, setImportingBank] = useState(false);

  // Manual form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>(() => Array(optionCount).fill(""));
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState("");
  const [marks, setMarks] = useState<string>(String(exam.default_marks));
  const [saveToBank, setSaveToBank] = useState(false);

  // AI Generation state (uses teacher's saved BYOK API key)
  const [aiClassLevel, setAiClassLevel] = useState("");
  const [aiSubject, setAiSubject] = useState(exam.subject);
  const [aiCount, setAiCount] = useState("5");
  const [aiNotes, setAiNotes] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState<string | null>(null);

  // Zero-storage PDF Import state
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);
  const [pdfImporting, setPdfImporting] = useState(false);

  // Draft Review Queue (shared by With AI & PDF Import)
  const [drafts, setDrafts] = useState<DraftMcqQuestion[]>([]);
  const [saveDraftsToBank, setSaveDraftsToBank] = useState(false);
  const [savingDrafts, setSavingDrafts] = useState(false);

  const [busy, setBusy] = useState(false);
  const [regrading, setRegrading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setText("");
    setOptions(Array(optionCount).fill(""));
    setCorrectIndex(0);
    setExplanation("");
    setMarks(String(exam.default_marks));
    setSaveToBank(false);
  }

  function startEdit(q: Question) {
    setError(null);
    setMessage(null);
    setActiveTab("manual");
    setEditingId(q.id);
    setText(q.text);
    const padded = Array.from({ length: optionCount }, (_, i) => q.options[i] ?? "");
    setOptions(padded);
    setCorrectIndex(Math.min(q.correct_index, optionCount - 1));
    setExplanation(q.explanation ?? "");
    setMarks(String(q.marks));
    setSaveToBank(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const supabase = createClient();
    if (!supabase) return;

    const cleanText = text.trim();
    const cleanOptions = options.map((o) => o.trim());
    const parsedMarks = Number(marks);

    if (!cleanText) {
      setError("Question text is required.");
      return;
    }
    if (cleanOptions.some((o) => !o)) {
      setError(`Please fill in all ${optionCount} options.`);
      return;
    }
    if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
      setError("Marks must be greater than 0.");
      return;
    }

    setBusy(true);

    if (editingId) {
      const { data: updated, error: updateErr } = await supabase
        .from("questions")
        .update({
          text: cleanText,
          options: cleanOptions,
          correct_index: correctIndex,
          explanation: explanation.trim() || null,
          marks: parsedMarks,
        })
        .eq("id", editingId)
        .select("*")
        .single<Question>();

      setBusy(false);
      if (updateErr || !updated) {
        setError(updateErr?.message ?? "Failed to update question.");
        return;
      }

      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setMessage(
        hasAttempts
          ? "Question updated. Click 'Re-grade Submitted Attempts' if you changed the answer key or marks."
          : "Question updated.",
      );
      resetForm();
      router.refresh();
      return;
    }

    let bankId: string | null = null;
    if (saveToBank) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: bankRow } = await supabase
          .from("question_bank")
          .insert({
            teacher_id: user.id,
            text: cleanText,
            options: cleanOptions,
            correct_index: correctIndex,
            explanation: explanation.trim() || null,
            subject: exam.subject,
            medium: exam.medium,
            source: "manual",
            visibility: "private",
          })
          .select("id")
          .single<{ id: string }>();
        bankId = bankRow?.id ?? null;
      }
    }

    const nextPosition =
      questions.length > 0 ? Math.max(...questions.map((q) => q.position)) + 1 : 0;

    const { data: inserted, error: insertErr } = await supabase
      .from("questions")
      .insert({
        exam_id: exam.id,
        position: nextPosition,
        text: cleanText,
        options: cleanOptions,
        correct_index: correctIndex,
        explanation: explanation.trim() || null,
        marks: parsedMarks,
        bank_id: bankId,
      })
      .select("*")
      .single<Question>();

    setBusy(false);
    if (insertErr || !inserted) {
      setError(insertErr?.message ?? "Failed to add question.");
      return;
    }

    setQuestions((prev) => [...prev, inserted]);
    setMessage(saveToBank ? "Question added and saved to your Question Bank." : "Question added.");
    resetForm();
    router.refresh();
  }

  async function handleGenerateWithAi(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setAiGenerating(true);
    setAiProgress(null);

    const requestedTotal = Math.min(100, Math.max(1, Math.floor(Number(aiCount) || 5)));
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
        setAiProgress(
          batches.length > 1
            ? `Generating batch ${i + 1} of ${batches.length} (${generatedTotal}/${requestedTotal})...`
            : "Generating drafts...",
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
            examId: exam.id,
            classLevel: aiClassLevel.trim(),
            subject: aiSubject.trim(),
            count,
            notes: `${aiNotes.trim()}${avoidNote}`,
          }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          drafts?: DraftMcqQuestion[];
          message?: string;
        };

        if (!res.ok || !data.ok || !data.drafts) {
          if (generatedTotal > 0) {
            setError(
              `Stopped after generating ${generatedTotal} drafts: ${data.message ?? "AI generation failed."}`,
            );
          } else {
            setError(data.message ?? "AI generation failed.");
          }
          return;
        }

        generatedTotal += data.drafts.length;
        seenStems.push(...data.drafts.map((d) => d.text.slice(0, 80)));
        setDrafts((prev) => [...prev, ...data.drafts!]);
      }

      setMessage(
        `Generated ${generatedTotal} draft question(s) using your ${aiProvider ?? "AI"} key. Review and confirm answers below before saving.`,
      );
    } catch {
      setError(
        generatedTotal > 0
          ? `Network interrupted after generating ${generatedTotal} drafts.`
          : "Network error while calling your AI provider.",
      );
    } finally {
      setAiGenerating(false);
      setAiProgress(null);
    }
  }

  async function handlePdfImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setError(null);
    setMessage(null);

    if (file.size > 10 * 1024 * 1024) {
      setError("PDF file must be 10 MB or smaller.");
      return;
    }

    setPdfImporting(true);
    setPdfProgress("Reading PDF in browser (0 bytes stored on server)...");

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const buffer = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buffer }).promise;
      const pagesToProcess = Math.min(doc.numPages, 10);

      const textPages: string[] = [];
      const visionImages: string[] = [];

      for (let p = 1; p <= pagesToProcess; p += 1) {
        setPdfProgress(`Inspecting page ${p} of ${pagesToProcess}...`);
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
          // Scanned or legacy Bijoy PDF page: render JPEG in browser for Vision OCR
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
        setPdfProgress(`Parsing ${textPages.length} Unicode text page(s) with your AI key...`);
        const res = await fetch("/api/teacher/ai/import-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId: exam.id,
            extractedText: textPages.join("\n\n"),
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          drafts?: DraftMcqQuestion[];
          message?: string;
        };
        if (!res.ok || !data.ok) {
          throw new Error(data.message ?? "Failed to parse PDF text.");
        }
        collected.push(...(data.drafts ?? []));
      }

      // Batch vision images 2 per request to respect serverless payload & timeout limits
      for (let i = 0; i < visionImages.length; i += 2) {
        const batch = visionImages.slice(i, i + 2);
        setPdfProgress(
          `OCR scanning image batch ${Math.floor(i / 2) + 1} of ${Math.ceil(visionImages.length / 2)}...`,
        );
        const res = await fetch("/api/teacher/ai/import-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId: exam.id,
            imageDataUrls: batch,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          drafts?: DraftMcqQuestion[];
          message?: string;
        };
        if (!res.ok || !data.ok) {
          throw new Error(data.message ?? "Failed to extract questions from scanned PDF page.");
        }
        collected.push(...(data.drafts ?? []));
      }

      if (collected.length === 0) {
        setError("No MCQs were extracted from that PDF.");
      } else {
        setDrafts((prev) => [...prev, ...collected]);
        setMessage(
          `Extracted ${collected.length} draft question(s) from ${pagesToProcess} page(s). Review and confirm answers below before saving.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF import failed.");
    } finally {
      setPdfImporting(false);
      setPdfProgress(null);
    }
  }

  async function handleSaveAllDrafts() {
    if (drafts.length === 0) return;
    setError(null);
    setMessage(null);

    for (let i = 0; i < drafts.length; i += 1) {
      const d = drafts[i];
      if (!d.text.trim() || d.options.some((o) => !o.trim())) {
        setError(`Draft #${i + 1} has blank question or option text.`);
        return;
      }
    }

    const supabase = createClient();
    if (!supabase) return;

    setSavingDrafts(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired. Please sign in again.");
      setSavingDrafts(false);
      return;
    }

    const startPos =
      questions.length > 0 ? Math.max(...questions.map((q) => q.position)) + 1 : 0;

    let bankIds: Array<string | null> = drafts.map(() => null);
    if (saveDraftsToBank) {
      const { data: bankRows } = await supabase
        .from("question_bank")
        .insert(
          drafts.map((d) => ({
            teacher_id: user.id,
            text: d.text.trim(),
            options: d.options.map((o) => o.trim()),
            correct_index: d.correct_index,
            explanation: d.explanation?.trim() || null,
            subject: exam.subject,
            class: aiClassLevel.trim(),
            medium: exam.medium,
            source: activeTab === "pdf" ? "pdf" : "ai",
            visibility: "private",
          })),
        )
        .select("id")
        .returns<Array<{ id: string }>>();

      if (bankRows && bankRows.length === drafts.length) {
        bankIds = bankRows.map((b) => b.id);
      }
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("questions")
      .insert(
        drafts.map((d, idx) => ({
          exam_id: exam.id,
          position: startPos + idx,
          text: d.text.trim(),
          options: d.options.map((o) => o.trim()),
          correct_index: d.correct_index,
          explanation: d.explanation?.trim() || null,
          marks: d.marks,
          bank_id: bankIds[idx],
        })),
      )
      .select("*")
      .returns<Question[]>();

    setSavingDrafts(false);
    if (insertErr || !inserted) {
      setError(insertErr?.message ?? "Failed to save approved drafts.");
      return;
    }

    setQuestions((prev) => [...prev, ...inserted]);
    setDrafts([]);
    setMessage(`Saved ${inserted.length} confirmed question(s) to the exam.`);
    router.refresh();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (hasAttempts) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const supabase = createClient();
    if (!supabase) return;

    const a = questions[index];
    const b = questions[targetIndex];
    const tempPosition = 999999;

    setBusy(true);
    setError(null);

    const r1 = await supabase.from("questions").update({ position: tempPosition }).eq("id", a.id);
    if (r1.error) {
      setError(r1.error.message);
      setBusy(false);
      return;
    }

    const r2 = await supabase.from("questions").update({ position: a.position }).eq("id", b.id);
    if (r2.error) {
      setError(r2.error.message);
      setBusy(false);
      return;
    }

    const r3 = await supabase.from("questions").update({ position: b.position }).eq("id", a.id);
    setBusy(false);
    if (r3.error) {
      setError(r3.error.message);
      return;
    }

    const updated = [...questions];
    updated[index] = { ...b, position: a.position };
    updated[targetIndex] = { ...a, position: b.position };
    setQuestions(updated);
    router.refresh();
  }

  async function handleDelete(q: Question) {
    if (hasAttempts) return;
    if (!window.confirm("Remove this question from the exam?")) return;

    const supabase = createClient();
    if (!supabase) return;

    setBusy(true);
    setError(null);
    const { error: delErr } = await supabase.from("questions").delete().eq("id", q.id);
    setBusy(false);

    if (delErr) {
      setError(delErr.message);
      return;
    }

    setQuestions((prev) => prev.filter((item) => item.id !== q.id));
    if (editingId === q.id) resetForm();
    router.refresh();
  }

  async function handleRegrade() {
    const supabase = createClient();
    if (!supabase) return;
    setRegrading(true);
    setError(null);
    setMessage(null);

    const { data, error: regradeErr } = await supabase.rpc("regrade_exam_attempts", {
      p_exam_id: exam.id,
    });
    setRegrading(false);

    if (regradeErr) {
      setError(regradeErr.message);
      return;
    }
    setMessage(`Re-graded ${Number(data ?? 0)} submitted attempt(s).`);
    router.refresh();
  }

  const filteredBank = useMemo(() => {
    const kw = bankKeyword.trim().toLowerCase();
    const subj = bankSubject.trim().toLowerCase();
    return initialBankItems.filter((item) => {
      if (item.medium !== exam.medium) return false;
      if (item.options.length !== optionCount) return false;
      if (subj && !item.subject.toLowerCase().includes(subj)) return false;
      if (kw) {
        const hay = `${item.text} ${item.subject} ${item.class} ${item.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [bankKeyword, bankSubject, exam.medium, initialBankItems, optionCount]);

  async function handleImportFromBank() {
    if (selectedBankIds.length === 0) return;
    const supabase = createClient();
    if (!supabase) return;

    const chosen = initialBankItems.filter((b) => selectedBankIds.includes(b.id));
    if (chosen.length === 0) return;

    const startPos =
      questions.length > 0 ? Math.max(...questions.map((q) => q.position)) + 1 : 0;

    setImportingBank(true);
    setError(null);
    setMessage(null);

    const { data: inserted, error: insertErr } = await supabase
      .from("questions")
      .insert(
        chosen.map((b, idx) => ({
          exam_id: exam.id,
          position: startPos + idx,
          text: b.text,
          options: b.options,
          correct_index: b.correct_index,
          explanation: b.explanation,
          marks: Number(exam.default_marks),
          bank_id: b.id,
        })),
      )
      .select("*")
      .returns<Question[]>();

    setImportingBank(false);
    if (insertErr || !inserted) {
      setError(insertErr?.message ?? "Failed to add selected bank questions.");
      return;
    }

    setQuestions((prev) => [...prev, ...inserted]);
    setSelectedBankIds([]);
    setMessage(`Added ${inserted.length} question(s) from Question Bank.`);
    router.refresh();
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {hasAttempts && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <span>
            Students have already started this exam. Adding, deleting, or reordering questions is
            locked, but you can fix typos or answer keys and re-grade.
          </span>
          <button
            type="button"
            disabled={regrading}
            onClick={handleRegrade}
            className="inline-flex min-h-[40px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {regrading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span>Re-grade Submitted Attempts</span>
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {/* Source Tabs + Forms */}
      {(!hasAttempts || editingId) && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {!editingId && (
            <div className="grid grid-cols-2 sm:flex border-b border-slate-200 bg-slate-50 p-2 sm:px-4 sm:pt-3 sm:pb-0 gap-1.5 sm:gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={`inline-flex min-h-[42px] items-center justify-center rounded-lg sm:rounded-b-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold cursor-pointer ${
                  activeTab === "manual"
                    ? "border border-slate-200 sm:border-b-white bg-white text-navy shadow-sm sm:shadow-none sm:-mb-px"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bank")}
                className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg sm:rounded-b-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold cursor-pointer ${
                  activeTab === "bank"
                    ? "border border-slate-200 sm:border-b-white bg-white text-navy shadow-sm sm:shadow-none sm:-mb-px"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>Question Bank</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ai")}
                className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg sm:rounded-b-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold cursor-pointer ${
                  activeTab === "ai"
                    ? "border border-slate-200 sm:border-b-white bg-white text-navy shadow-sm sm:shadow-none sm:-mb-px"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber shrink-0" />
                <span>With AI</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pdf")}
                className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg sm:rounded-b-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold cursor-pointer ${
                  activeTab === "pdf"
                    ? "border border-slate-200 sm:border-b-white bg-white text-navy shadow-sm sm:shadow-none sm:-mb-px"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileUp className="h-3.5 w-3.5 text-navy shrink-0" />
                <span>PDF Import</span>
              </button>
            </div>
          )}

          <div className="p-4 sm:p-6">
            {/* TAB 2: Question Bank Snapshot Import */}
            {activeTab === "bank" && !editingId && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-navy">Add from Question Bank</h2>
                    <p className="text-xs text-slate-500">
                      Showing {exam.medium === "bn" ? "Bangla" : "English"} {optionCount}-option
                      questions from your bank and shared teacher bank. Copies a snapshot into this
                      exam.
                    </p>
                  </div>
                  <Link href="/teacher/bank" className="text-xs font-semibold text-navy hover:underline">
                    Manage Question Bank →
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3.5 sm:top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={bankKeyword}
                      onChange={(e) => setBankKeyword(e.target.value)}
                      placeholder="Search keyword or tag..."
                      className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-base sm:text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    value={bankSubject}
                    onChange={(e) => setBankSubject(e.target.value)}
                    placeholder="Filter by subject..."
                    className="h-11 sm:h-[42px] rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm"
                  />
                </div>

                {filteredBank.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                    No matching {optionCount}-option {exam.medium === "bn" ? "Bangla" : "English"}{" "}
                    questions found in your Question Bank.
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
                                e.target.checked
                                  ? [...prev, b.id]
                                  : prev.filter((id) => id !== b.id),
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
                              {b.visibility}
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
                    onClick={handleImportFromBank}
                    className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-50 cursor-pointer"
                  >
                    {importingBank ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>Add Selected ({selectedBankIds.length})</span>
                  </button>
                </div>
              </div>
            )}
            {/* TAB 1: Manual Entry (or Edit) */}
            {(activeTab === "manual" || editingId) && (
              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-navy">
                    {editingId ? "Edit Question" : "Add Question Manually"}
                  </h2>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="min-h-[36px] px-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="q-text" className="block text-sm font-medium text-slate-700">
                    Question text{" "}
                    <span className="text-xs font-normal text-slate-400">
                      (inline math supported via $x^2 + y^2$)
                    </span>
                  </label>
                  <textarea
                    id="q-text"
                    rows={3}
                    required
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                      exam.medium === "bn"
                        ? "এখানে বাংলা বা ইংরেজিতে প্রশ্ন লিখুন..."
                        : "Enter question text..."
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                  />
                  {text.includes("$") && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800 border border-slate-200">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-2">
                        Preview:
                      </span>
                      <MathText text={text} />
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <span className="block text-sm font-medium text-slate-700">
                    Options (select the correct answer)
                  </span>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-2.5 py-2 ${
                          correctIndex === idx
                            ? "border-emerald-400 bg-emerald-50/50"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="correct-option"
                          aria-label={`Mark option ${optionLabel(idx, exam.medium)} correct`}
                          checked={correctIndex === idx}
                          onChange={() => setCorrectIndex(idx)}
                          className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-emerald-600 cursor-pointer"
                        />
                        <span className="font-semibold text-xs text-slate-600 w-5 text-center shrink-0">
                          {optionLabel(idx, exam.medium)}
                        </span>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const next = [...options];
                            next[idx] = e.target.value;
                            setOptions(next);
                          }}
                          placeholder={`Option ${optionLabel(idx, exam.medium)}`}
                          className="w-full bg-transparent text-base sm:text-sm text-slate-900 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="q-expl" className="block text-sm font-medium text-slate-700">
                      Explanation{" "}
                      <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="q-expl"
                      type="text"
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="Shown after results release if Show Answers is enabled"
                      className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="q-marks" className="block text-sm font-medium text-slate-700">
                      Marks
                    </label>
                    <input
                      id="q-marks"
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                    />
                  </div>
                </div>

                {!editingId && (
                  <label className="flex min-h-[40px] items-center gap-2.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToBank}
                      onChange={(e) => setSaveToBank(e.target.checked)}
                      className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
                    />
                    <span>Also save a copy to my Question Bank</span>
                  </label>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>{editingId ? "Update Question" : "Add Question"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: With AI (Teacher's Own Key) */}
            {activeTab === "ai" && !editingId && (
              <div className="space-y-4">
                {!hasAiKey ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2.5 text-sm text-amber-950">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Add your own AI API key first</p>
                        <p className="text-xs text-amber-900">
                          Each teacher uses their own Gemini (free tier), Groq (free tier), OpenAI,
                          or Anthropic key saved encrypted in Settings.
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/teacher/settings#ai-key"
                      className="inline-flex min-h-[40px] w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Add API Key in Settings</span>
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleGenerateWithAi} className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-navy">
                          Generate MCQ Drafts Using Your {aiProvider?.toUpperCase()} Key
                        </h2>
                        <p className="text-xs text-slate-500">
                          Auto-configured for {exam.medium === "bn" ? "Bangla" : "English"} •{" "}
                          {exam.options_per_question} options • {exam.default_marks} mark(s) each
                        </p>
                      </div>
                      <Link
                        href="/teacher/settings#ai-key"
                        className="text-xs font-semibold text-navy hover:underline"
                      >
                        Change API key
                      </Link>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <label htmlFor="ai-class" className="block text-sm font-medium text-slate-700">
                          Class / Level
                        </label>
                        <input
                          id="ai-class"
                          type="text"
                          value={aiClassLevel}
                          onChange={(e) => setAiClassLevel(e.target.value)}
                          placeholder="e.g. Class 9–10 / HSC"
                          className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="ai-subj" className="block text-sm font-medium text-slate-700">
                          Subject
                        </label>
                        <input
                          id="ai-subj"
                          type="text"
                          value={aiSubject}
                          onChange={(e) => setAiSubject(e.target.value)}
                          placeholder="e.g. পদার্থবিজ্ঞান"
                          className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="ai-count" className="block text-sm font-medium text-slate-700">
                          Questions to generate (max 100)
                        </label>
                        <input
                          id="ai-count"
                          type="number"
                          min={1}
                          max={100}
                          value={aiCount}
                          onChange={(e) => setAiCount(e.target.value)}
                          className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor="ai-notes" className="block text-sm font-medium text-slate-700">
                          Chapter, syllabus, or extra notes
                        </label>
                        <span className="text-[11px] font-medium text-slate-400">
                          Tap a sample prompt to auto-fill:
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(exam.medium === "bn"
                          ? [
                              {
                                label: "Physics (গতিসূত্র ও গাণিতিক)",
                                classLevel: "HSC / Class 11–12",
                                subject: "পদার্থবিজ্ঞান",
                                notes:
                                  "নিউটনের গতিসূত্র, কাজ-শক্তি-ক্ষমতা ও মহাকর্ষ অধ্যায় থেকে বোর্ড পরীক্ষার মানের গাণিতিক ও তাত্ত্বিক MCQ তৈরি করুন (প্রয়োজনে $...$ সূত্রসহ)।",
                              },
                              {
                                label: "Chemistry (মোল ও পর্যায় সারণি)",
                                classLevel: "SSC / Class 9–10",
                                subject: "রসায়ন",
                                notes:
                                  "মোল ও রাসায়নিক গণনা, পর্যায় সারণি এবং রাসায়নিক বন্ধন থেকে ধারণাগত ও প্রয়োগমূলক MCQ তৈরি করুন।",
                              },
                              {
                                label: "Higher Math (অন্তরীকরণ ও ম্যাট্রিক্স)",
                                classLevel: "HSC",
                                subject: "উচ্চতর গণিত",
                                notes:
                                  "অন্তরীকরণ, যোগজীকরণ ও ম্যাট্রিক্স-নির্ণায়ক থেকে মাঝারি ও কঠিন মানের $...$ সূত্রযুক্ত MCQ তৈরি করুন।",
                              },
                              {
                                label: "ICT (সংখ্যা পদ্ধতি ও লজিক গেট)",
                                classLevel: "HSC",
                                subject: "তথ্য ও যোগাযোগ প্রযুক্তি",
                                notes:
                                  "সংখ্যা পদ্ধতি (বাইনারি-হেক্সাডেসিমেল রূপান্তর), লজিক গেট ও HTML ট্যাগ থেকে বোর্ড মানের MCQ তৈরি করুন।",
                              },
                            ]
                          : [
                              {
                                label: "Physics (Kinematics & Forces)",
                                classLevel: "HSC / Grade 11–12",
                                subject: "Physics",
                                notes:
                                  "Create conceptual and numerical MCQs on Kinematics, Newton's Laws, and Work-Energy using $...$ LaTeX formulas where appropriate.",
                              },
                              {
                                label: "Chemistry (Periodic Table & Moles)",
                                classLevel: "SSC / Grade 9–10",
                                subject: "Chemistry",
                                notes:
                                  "Create MCQs on Atomic Structure, Periodic Table trends, and Mole Concept calculations with brief explanations.",
                              },
                              {
                                label: "Mathematics (Algebra & Trig)",
                                classLevel: "Grade 10–12",
                                subject: "Mathematics",
                                notes:
                                  "Generate mixed-difficulty MCQs on Quadratic Equations, Trigonometry, and Probability using inline $...$ notation.",
                              },
                              {
                                label: "English Grammar & Usage",
                                classLevel: "HSC / Admission",
                                subject: "English",
                                notes:
                                  "Generate MCQs on Right Form of Verbs, Prepositions, Clauses, and Synonyms/Antonyms with clear grammar explanations.",
                              },
                            ]
                        ).map((sample) => (
                          <button
                            key={sample.label}
                            type="button"
                            onClick={() => {
                              setAiClassLevel(sample.classLevel);
                              setAiSubject(sample.subject);
                              setAiNotes(sample.notes);
                            }}
                            className="inline-flex min-h-[34px] items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-navy hover:bg-navy/5 hover:text-navy active:scale-95 transition cursor-pointer"
                          >
                            {sample.label}
                          </button>
                        ))}
                      </div>

                      <textarea
                        id="ai-notes"
                        rows={3}
                        required
                        value={aiNotes}
                        onChange={(e) => setAiNotes(e.target.value)}
                        placeholder="e.g. নিউটনের গতিসূত্র, ভরবেগ এবং ঘর্ষণ বল — বোর্ড পরীক্ষার মানের প্রশ্ন।"
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
                        <span>{aiGenerating ? (aiProgress ?? "Generating drafts...") : "Generate Drafts"}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: Zero-Storage PDF Import */}
            {activeTab === "pdf" && !editingId && (
              <div className="space-y-4">
                {!hasAiKey ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2.5 text-sm text-amber-950">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Add your own AI API key to import PDFs</p>
                        <p className="text-xs text-amber-900">
                          PDF pages are parsed in your browser and sent directly using your own
                          saved key (Gemini free tier supports both Bangla text and scanned/Bijoy
                          page images).
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/teacher/settings#ai-key"
                      className="inline-flex min-h-[40px] w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Add API Key</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-base font-bold text-navy">
                        Zero-Storage PDF Import (Up to 10 Pages / 10 MB)
                      </h2>
                      <p className="text-xs text-slate-600">
                        Unicode Bangla/English PDFs extract locally as text; scanned or legacy
                        Bijoy PDFs are rendered to browser images and scanned via your{" "}
                        {aiProvider?.toUpperCase()} key. Nothing is saved to Supabase Storage.
                      </p>
                    </div>

                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 sm:p-6 text-center hover:border-navy hover:bg-slate-100/70 cursor-pointer">
                      <FileUp className="h-6 w-6 text-navy" />
                      <span className="text-sm font-semibold text-slate-800">
                        {pdfImporting
                          ? pdfProgress ?? "Processing PDF..."
                          : "Choose a question PDF to extract into drafts"}
                      </span>
                      <span className="text-xs text-slate-500">
                        All drafts require your review before saving to the exam
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        disabled={pdfImporting}
                        onChange={handlePdfImport}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Draft Review Queue */}
      {drafts.length > 0 && (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy">
                Review Draft Questions ({drafts.length})
              </h2>
              <p className="text-xs text-slate-600">
                Verify every question and confirm the correct answer radio button before saving.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrafts([])}
                className="min-h-[36px] text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
              >
                Discard all drafts
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {drafts.map((draft, dIdx) => (
              <div
                key={dIdx}
                className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-700">Draft #{dIdx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setDrafts((prev) => prev.filter((_, idx) => idx !== dIdx))}
                    className="min-h-[32px] px-2 text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>

                <textarea
                  rows={2}
                  value={draft.text}
                  onChange={(e) => {
                    const next = [...drafts];
                    next[dIdx] = { ...draft, text: e.target.value };
                    setDrafts(next);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm"
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  {draft.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-2.5 py-2 ${
                        draft.correct_index === optIdx
                          ? "border-emerald-400 bg-emerald-50/60"
                          : "border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`draft-correct-${dIdx}`}
                        checked={draft.correct_index === optIdx}
                        onChange={() => {
                          const next = [...drafts];
                          next[dIdx] = { ...draft, correct_index: optIdx };
                          setDrafts(next);
                        }}
                        className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-emerald-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-600 shrink-0">
                        {optionLabel(optIdx, exam.medium)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...drafts];
                          const nextOpts = [...draft.options];
                          nextOpts[optIdx] = e.target.value;
                          next[dIdx] = { ...draft, options: nextOpts };
                          setDrafts(next);
                        }}
                        className="w-full bg-transparent text-base sm:text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <label className="flex min-h-[40px] items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={saveDraftsToBank}
                onChange={(e) => setSaveDraftsToBank(e.target.checked)}
                className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
              />
              <span>Also save approved drafts to my Question Bank</span>
            </label>

            <button
              type="button"
              disabled={savingDrafts}
              onClick={handleSaveAllDrafts}
              className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
            >
              {savingDrafts ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>Confirm &amp; Save {drafts.length} Draft(s)</span>
            </button>
          </div>
        </section>
      )}

      {/* Existing Question List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Questions ({questions.length})</h2>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No questions added yet. Add manually, generate with your AI key, or import from PDF.
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      Q{idx + 1} • {q.marks} mark{Number(q.marks) === 1 ? "" : "s"}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {!hasAttempts && (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0 || busy}
                            onClick={() => handleMove(idx, -1)}
                            title="Move up"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === questions.length - 1 || busy}
                            onClick={() => handleMove(idx, 1)}
                            title="Move down"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(q)}
                        title="Edit"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!hasAttempts && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(q)}
                          title="Delete"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[15px] sm:text-sm font-semibold text-slate-900 leading-relaxed break-words">
                    <MathText text={q.text} />
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.correct_index;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 sm:py-2 text-[13px] sm:text-xs ${
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-900"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {isCorrect && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span className="min-w-0 break-words">
                          {optionLabel(optIdx, exam.medium)}) <MathText text={opt} />
                        </span>
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold">Explanation:</span>{" "}
                    <MathText text={q.explanation} />
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
