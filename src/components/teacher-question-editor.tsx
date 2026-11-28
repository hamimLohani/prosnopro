"use client";

import {
  BookOpen,
  ClipboardPaste,
  FileUp,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { useLang } from "@/components/language-provider";
import { AiGeneratorTab, PdfImportTab } from "@/components/question-editor/ai-pdf-tabs";
import { BankImportTab } from "@/components/question-editor/bank-import-tab";
import { BulkPasteTab } from "@/components/question-editor/bulk-paste-tab";
import { DraftReviewQueue } from "@/components/question-editor/draft-review-queue";
import { ExamQuestionList } from "@/components/question-editor/exam-question-list";
import { ManualQuestionForm } from "@/components/question-editor/manual-question-form";
import { StatusToast } from "@/components/status-toast";
import { generateAiDraftBatches, importPdfDraftsFromFile } from "@/lib/ai/client-drafts";
import type { DraftMcqQuestion } from "@/lib/ai/schema";
import { pickText } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Exam, Question, QuestionBankItem } from "@/lib/types";

interface TeacherQuestionEditorProps {
  exam: Exam;
  initialQuestions: Question[];
  initialBankItems: QuestionBankItem[];
  hasAttempts: boolean;
  hasAiKey: boolean;
  aiProvider: string | null;
}

type SourceTab = "manual" | "paste" | "bank" | "ai" | "pdf";

export function TeacherQuestionEditor({
  exam,
  initialQuestions,
  initialBankItems,
  hasAttempts,
  hasAiKey,
  aiProvider,
}: TeacherQuestionEditorProps) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const optionCount = exam.options_per_question;

  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [activeTab, setActiveTab] = useState<SourceTab>("manual");
  const [composerOpen, setComposerOpen] = useState(initialQuestions.length === 0);

  const [importingBank, setImportingBank] = useState(false);
  const [savingToBankKey, setSavingToBankKey] = useState<string | null>(null);

  // Manual form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>(() => Array(optionCount).fill(""));
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState("");
  const [marks, setMarks] = useState<string>(String(exam.default_marks));
  const [saveToBank, setSaveToBank] = useState(true);

  // AI & PDF generation state (BYOK)
  const [aiClassLevel, setAiClassLevel] = useState(exam.class ?? "");
  const [aiSubject, setAiSubject] = useState(exam.subject);
  const [aiCount, setAiCount] = useState("5");
  const [aiNotes, setAiNotes] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);
  const [pdfImporting, setPdfImporting] = useState(false);

  // Shared draft queue (Bulk Paste, AI, PDF)
  const [drafts, setDrafts] = useState<DraftMcqQuestion[]>([]);
  const [editingDraftIdx, setEditingDraftIdx] = useState<number | null>(null);
  const [saveDraftsToBank, setSaveDraftsToBank] = useState(true);
  const [savingDrafts, setSavingDrafts] = useState(false);

  const [busy, setBusy] = useState(false);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<Question | null>(null);
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
    setSaveToBank(true);
  }

  function startEdit(q: Question) {
    setError(null);
    setMessage(null);
    setActiveTab("manual");
    setEditingId(q.id);
    setText(q.text);
    setOptions(Array.from({ length: optionCount }, (_, i) => q.options[i] ?? ""));
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
      setError(t("প্রশ্নের লেখা দেওয়া আবশ্যক।", "Question text is required."));
      return;
    }
    if (cleanOptions.some((o) => !o)) {
      setError(
        t(`দয়া করে সব ${optionCount}টি Option পূরণ করুন।`, `Please fill in all ${optionCount} options.`),
      );
      return;
    }
    if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
      setError(t("নম্বর ০-এর চেয়ে বেশি হতে হবে।", "Marks must be greater than 0."));
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
        setError(
          updateErr?.message ?? t("প্রশ্ন আপডেট করা যায়নি।", "Failed to update question."),
        );
        return;
      }

      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setMessage(
        hasAttempts
          ? t(
              "প্রশ্ন আপডেট হয়েছে। উত্তর বা নম্বর বদলালে 'Submit করা উত্তর Re-grade করুন' চাপুন।",
              "Question updated. Click 'Re-grade Submitted Attempts' if you changed the answer key or marks.",
            )
          : t("প্রশ্ন আপডেট হয়েছে।", "Question updated."),
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
            class: exam.class ?? "",
            medium: exam.medium,
            source: "manual",
            visibility: exam.practice_sharing ? "shared" : "private",
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
      setError(insertErr?.message ?? t("প্রশ্ন যোগ করা যায়নি।", "Failed to add question."));
      return;
    }

    setQuestions((prev) => [...prev, inserted]);
    setMessage(
      saveToBank
        ? t(
            "প্রশ্ন যোগ হয়েছে এবং Question Bank-এ Save হয়েছে।",
            "Question added and saved to your Question Bank.",
          )
        : t("প্রশ্ন যোগ হয়েছে।", "Question added."),
    );
    resetForm();
    router.refresh();
  }

  async function handleGenerateWithAi(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setAiGenerating(true);

    const result = await generateAiDraftBatches({
      examId: exam.id,
      classLevel: aiClassLevel,
      subject: aiSubject,
      requestedCount: Number(aiCount) || 5,
      notes: aiNotes,
      aiProvider,
      lang,
      onProgress: setAiProgress,
      onBatchDrafts: (batch) => setDrafts((prev) => [...prev, ...batch]),
    });

    setAiGenerating(false);
    if (result.ok) {
      setMessage(result.message);
    } else {
      setError(result.error);
    }
  }

  async function handlePdfImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setError(null);
    setMessage(null);
    setPdfImporting(true);

    const result = await importPdfDraftsFromFile({
      file,
      examId: exam.id,
      lang,
      onProgress: setPdfProgress,
    });

    setPdfImporting(false);
    if (result.ok) {
      setDrafts((prev) => [...prev, ...result.drafts]);
      setMessage(result.message);
    } else {
      setError(result.error);
    }
  }

  async function handleSaveAllDrafts() {
    if (drafts.length === 0) return;
    setError(null);
    setMessage(null);

    for (let i = 0; i < drafts.length; i += 1) {
      const d = drafts[i];
      if (!d.text.trim() || d.options.some((o) => !o.trim())) {
        setError(
          t(
            `Draft #${i + 1}-এ প্রশ্ন বা Option ফাঁকা রয়েছে।`,
            `Draft #${i + 1} has blank question or option text.`,
          ),
        );
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
      setError(t("Session শেষ হয়ে গেছে। আবার Sign in করুন।", "Session expired. Please sign in again."));
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
            visibility: exam.practice_sharing ? "shared" : "private",
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
      setError(
        insertErr?.message ?? t("অনুমোদিত Draft-গুলো Save করা যায়নি।", "Failed to save approved drafts."),
      );
      return;
    }

    setQuestions((prev) => [...prev, ...inserted]);
    setDrafts([]);
    setEditingDraftIdx(null);
    setMessage(
      t(
        `${inserted.length}টি অনুমোদিত প্রশ্ন Exam-এ যুক্ত হয়েছে।`,
        `Saved ${inserted.length} confirmed question(s) to the exam.`,
      ),
    );
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

    const supabase = createClient();
    if (!supabase) {
      setPendingDeleteQuestion(null);
      return;
    }

    setBusy(true);
    setError(null);
    const { error: delErr } = await supabase.from("questions").delete().eq("id", q.id);
    setBusy(false);
    setPendingDeleteQuestion(null);

    if (delErr) {
      setError(delErr.message);
      return;
    }

    setQuestions((prev) => prev.filter((item) => item.id !== q.id));
    if (editingId === q.id) resetForm();
    setMessage(t("প্রশ্নটি Exam থেকে সরানো হয়েছে।", "Question removed from exam."));
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
    const count = Number(data ?? 0);
    setMessage(
      t(
        `${count}টি Submit করা Attempt পুনরায় মূল্যায়ন (Re-grade) করা হয়েছে।`,
        `Re-graded ${count} submitted attempt(s).`,
      ),
    );
    router.refresh();
  }

  async function handleSaveQuestionsToBank(targets: Question[], key: string) {
    const unsaved = targets.filter((q) => !q.bank_id);
    if (unsaved.length === 0) return;

    const supabase = createClient();
    if (!supabase) return;

    setSavingToBankKey(key);
    setError(null);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingToBankKey(null);
      setError(t("Session শেষ হয়ে গেছে। আবার Sign in করুন।", "Session expired. Please sign in again."));
      return;
    }

    const { data: insertedBank, error: bankErr } = await supabase
      .from("question_bank")
      .insert(
        unsaved.map((q) => ({
          teacher_id: user.id,
          text: q.text,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation,
          subject: exam.subject,
          class: exam.class ?? "",
          medium: exam.medium,
          source: "manual",
          visibility: exam.practice_sharing ? "shared" : "private",
        })),
      )
      .select("id")
      .returns<Array<{ id: string }>>();

    if (bankErr || !insertedBank || insertedBank.length !== unsaved.length) {
      setSavingToBankKey(null);
      setError(
        bankErr?.message ??
          t("Question Bank-এ সংরক্ষণ করা যায়নি।", "Could not save to Question Bank."),
      );
      return;
    }

    const idMap = new Map<string, string>();
    unsaved.forEach((q, idx) => {
      idMap.set(q.id, insertedBank[idx].id);
    });

    if (!hasAttempts) {
      await Promise.all(
        unsaved.map((q, idx) =>
          supabase.from("questions").update({ bank_id: insertedBank[idx].id }).eq("id", q.id),
        ),
      );
    }

    setQuestions((prev) =>
      prev.map((q) => (idMap.has(q.id) ? { ...q, bank_id: idMap.get(q.id) ?? q.bank_id } : q)),
    );
    setSavingToBankKey(null);
    setMessage(
      t(
        `${unsaved.length}টি প্রশ্ন Question Bank-এ সংরক্ষণ করা হয়েছে।`,
        `Saved ${unsaved.length} question(s) to Question Bank.`,
      ),
    );
    router.refresh();
  }

  async function handleImportFromBank(selectedIds: string[], onDone: () => void) {
    if (selectedIds.length === 0) return;
    const supabase = createClient();
    if (!supabase) return;

    const chosen = initialBankItems.filter((b) => selectedIds.includes(b.id));
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
      setError(
        insertErr?.message ??
          t("নির্বাচিত প্রশ্নগুলো যোগ করা যায়নি।", "Failed to add selected bank questions."),
      );
      return;
    }

    setQuestions((prev) => [...prev, ...inserted]);
    onDone();
    setMessage(
      t(
        `Question Bank থেকে ${inserted.length}টি প্রশ্ন যোগ হয়েছে।`,
        `Added ${inserted.length} question(s) from Question Bank.`,
      ),
    );
    router.refresh();
  }

  const tabs: Array<{ id: SourceTab; label: string; icon?: React.ReactNode }> = [
    { id: "manual", label: t("Manual", "Manual") },
    {
      id: "paste",
      label: t("Bulk Paste", "Bulk Paste"),
      icon: <ClipboardPaste className="h-3.5 w-3.5 text-navy shrink-0" />,
    },
    {
      id: "bank",
      label: t("Question Bank", "Question Bank"),
      icon: <BookOpen className="h-3.5 w-3.5 text-emerald-700 shrink-0" />,
    },
    {
      id: "ai",
      label: t("AI দিয়ে", "With AI"),
      icon: <Sparkles className="h-3.5 w-3.5 text-amber shrink-0" />,
    },
    {
      id: "pdf",
      label: t("PDF Import", "PDF Import"),
      icon: <FileUp className="h-3.5 w-3.5 text-navy shrink-0" />,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {hasAttempts && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <span>
            {t(
              "Student-রা ইতিমধ্যে এই Exam শুরু করেছে। প্রশ্ন যোগ, মুছে ফেলা বা ক্রম পরিবর্তন লক করা আছে, তবে বানান বা সঠিক উত্তর ঠিক করে Re-grade করতে পারবেন।",
              "Students have already started this exam. Adding, deleting, or reordering questions is locked, but you can fix typos or answers and re-grade.",
            )}
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
            <span>{t("Submit করা উত্তর Re-grade করুন", "Re-grade Submitted Attempts")}</span>
          </button>
        </div>
      )}

      {/* Collapsible Add Question Launcher when questions already exist */}
      {!hasAttempts && !editingId && !composerOpen && (
        <section className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("আরও প্রশ্ন যোগ করুন", "Add More Questions")}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setComposerOpen(true);
                }}
                className={`${idx === tabs.length - 1 ? "col-span-2 sm:col-span-1 " : ""}inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer ${
                  tab.id === "manual"
                    ? "bg-navy text-white hover:bg-navy-strong"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.id === "manual" ? <Plus className="h-3.5 w-3.5" /> : tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Source Tabs + Forms */}
      {((!hasAttempts && composerOpen) || editingId) && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {!editingId && (
            <div className="border-b border-slate-200 bg-slate-50 p-2 sm:px-4 sm:pt-3 sm:pb-0 space-y-2 sm:space-y-0">
              {questions.length > 0 && (
                <div className="flex items-center justify-between px-1 sm:hidden">
                  <span className="text-xs font-semibold text-slate-500">
                    {t("প্রশ্ন যোগ করুন", "Add Question")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    className="min-h-[34px] px-1 text-xs font-semibold text-navy hover:underline cursor-pointer"
                  >
                    {t("Form লুকান", "Hide Form")}
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1.5 sm:gap-1 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex min-h-[40px] sm:min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-lg sm:rounded-b-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer ${
                      activeTab === tab.id
                        ? "border border-slate-200 sm:border-b-white bg-white text-navy shadow-xs sm:shadow-none sm:-mb-px"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
                {questions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    className="hidden sm:inline-flex ml-auto shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {t("Form লুকান", "Hide Form")}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="p-4 sm:p-6">
            {activeTab === "paste" && !editingId && (
              <BulkPasteTab
                medium={exam.medium}
                optionCount={optionCount}
                defaultMarks={Number(exam.default_marks)}
                subject={exam.subject}
                classLevel={exam.class}
                onError={(msg) => {
                  setMessage(null);
                  setError(msg);
                }}
                onDraftsAdded={(parsed) => {
                  setError(null);
                  setDrafts((prev) => [...prev, ...parsed]);
                  setMessage(
                    t(
                      `${parsed.length}টি Draft তৈরি হয়েছে — নিচে যাচাই করে Save করুন।`,
                      `Created ${parsed.length} draft(s) — review and save below.`,
                    ),
                  );
                }}
              />
            )}

            {activeTab === "bank" && !editingId && (
              <BankImportTab
                bankItems={initialBankItems}
                examMedium={exam.medium}
                optionCount={optionCount}
                importingBank={importingBank}
                onImport={(selectedIds, onDone) => void handleImportFromBank(selectedIds, onDone)}
              />
            )}

            {(activeTab === "manual" || editingId) && (
              <ManualQuestionForm
                medium={exam.medium}
                optionCount={optionCount}
                editingId={editingId}
                text={text}
                options={options}
                correctIndex={correctIndex}
                explanation={explanation}
                marks={marks}
                saveToBank={saveToBank}
                busy={busy}
                onTextChange={setText}
                onOptionsChange={setOptions}
                onCorrectIndexChange={setCorrectIndex}
                onExplanationChange={setExplanation}
                onMarksChange={setMarks}
                onSaveToBankChange={setSaveToBank}
                onCancelEdit={resetForm}
                onSubmit={handleSaveQuestion}
              />
            )}

            {activeTab === "ai" && !editingId && (
              <AiGeneratorTab
                returnToPath={`/teacher/exams/${exam.id}/questions`}
                medium={exam.medium}
                optionCount={optionCount}
                defaultMarks={Number(exam.default_marks)}
                hasAiKey={hasAiKey}
                aiProvider={aiProvider}
                aiClassLevel={aiClassLevel}
                aiSubject={aiSubject}
                aiCount={aiCount}
                aiNotes={aiNotes}
                aiGenerating={aiGenerating}
                aiProgress={aiProgress}
                onClassChange={setAiClassLevel}
                onSubjectChange={setAiSubject}
                onCountChange={setAiCount}
                onNotesChange={setAiNotes}
                onGenerate={handleGenerateWithAi}
              />
            )}

            {activeTab === "pdf" && !editingId && (
              <PdfImportTab
                returnToPath={`/teacher/exams/${exam.id}/questions`}
                hasAiKey={hasAiKey}
                aiProvider={aiProvider}
                pdfImporting={pdfImporting}
                pdfProgress={pdfProgress}
                onPdfSelect={handlePdfImport}
              />
            )}
          </div>
        </section>
      )}

      <DraftReviewQueue
        drafts={drafts}
        medium={exam.medium}
        editingDraftIdx={editingDraftIdx}
        saveDraftsToBank={saveDraftsToBank}
        savingDrafts={savingDrafts}
        onSetDrafts={setDrafts}
        onSetEditingDraftIdx={setEditingDraftIdx}
        onSaveDraftsToBankChange={setSaveDraftsToBank}
        onSaveAllDrafts={() => void handleSaveAllDrafts()}
        onDiscardAll={() => {
          setDrafts([]);
          setEditingDraftIdx(null);
        }}
      />

      <ExamQuestionList
        questions={questions}
        medium={exam.medium}
        hasAttempts={hasAttempts}
        busy={busy}
        savingToBankKey={savingToBankKey}
        onSaveToBank={(targets, key) => void handleSaveQuestionsToBank(targets, key)}
        onMove={(idx, dir) => void handleMove(idx, dir)}
        onEdit={startEdit}
        onRequestDelete={setPendingDeleteQuestion}
      />

      <ConfirmModal
        open={pendingDeleteQuestion !== null}
        title={t("প্রশ্নটি সরিয়ে ফেলবেন?", "Remove Question?")}
        message={t(
          "এই Exam থেকে প্রশ্নটি সরিয়ে ফেলতে চান?",
          "Are you sure you want to remove this question from this exam?",
        )}
        confirmLabel={t("সরিয়ে ফেলুন", "Remove")}
        busy={busy}
        onCancel={() => setPendingDeleteQuestion(null)}
        onConfirm={() => {
          if (pendingDeleteQuestion) void handleDelete(pendingDeleteQuestion);
        }}
      />

      <StatusToast
        message={error ?? message}
        tone={error ? "error" : "success"}
        onDismiss={() => {
          setError(null);
          setMessage(null);
        }}
      />
    </div>
  );
}
