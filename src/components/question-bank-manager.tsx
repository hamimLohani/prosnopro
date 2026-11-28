"use client";

import { ClipboardPaste, FileUp, Globe, Lock, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ClassSelect } from "@/components/class-select";
import { ConfirmModal } from "@/components/confirm-modal";
import { useLang } from "@/components/language-provider";
import { QuestionBankCard } from "@/components/question-bank/question-bank-card";
import { QuestionBankForm } from "@/components/question-bank/question-bank-form";
import { AiGeneratorTab, PdfImportTab } from "@/components/question-editor/ai-pdf-tabs";
import { BulkPasteTab } from "@/components/question-editor/bulk-paste-tab";
import { DraftReviewQueue } from "@/components/question-editor/draft-review-queue";
import { SearchableSubjectSelect } from "@/components/searchable-subject-select";
import { StatusToast } from "@/components/status-toast";
import { generateAiDraftBatches, importPdfDraftsFromFile } from "@/lib/ai/client-drafts";
import type { DraftMcqQuestion } from "@/lib/ai/schema";
import { pickText } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { ExamMedium, QuestionBankItem } from "@/lib/types";

interface QuestionBankManagerProps {
  teacherId: string;
  initialItems: QuestionBankItem[];
  hasAiKey?: boolean;
  aiProvider?: string | null;
}

type BankSourceTab = "manual" | "paste" | "ai" | "pdf";

const BANK_PAGE_SIZE = 30;
const FIXED_OPTIONS_COUNT = 4;

export function QuestionBankManager({
  teacherId,
  initialItems,
  hasAiKey = false,
  aiProvider = null,
}: QuestionBankManagerProps) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [items, setItems] = useState<QuestionBankItem[]>(initialItems);
  const [visibleCount, setVisibleCount] = useState(BANK_PAGE_SIZE);

  // Filters
  const [scope, setScope] = useState<"all" | "mine" | "shared">("all");
  const [mediumFilter, setMediumFilter] = useState<"all" | ExamMedium>("all");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [keyword, setKeyword] = useState("");

  // Composer state (Manual, Bulk Paste, With AI, PDF Import) - strictly 4 options
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<BankSourceTab>("manual");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [medium, setMedium] = useState<ExamMedium>("bn");
  const [visibility, setVisibility] = useState<"private" | "shared">("private");

  // AI & PDF generation state
  const [aiCount, setAiCount] = useState("5");
  const [aiNotes, setAiNotes] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const [pdfImporting, setPdfImporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);

  // Draft Review Queue (Bulk Paste, With AI, PDF Import)
  const [drafts, setDrafts] = useState<DraftMcqQuestion[]>([]);
  const [draftSource, setDraftSource] = useState<"manual" | "ai" | "pdf">("manual");
  const [editingDraftIdx, setEditingDraftIdx] = useState<number | null>(null);
  const [savingDrafts, setSavingDrafts] = useState(false);

  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<QuestionBankItem | null>(null);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setText("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    setExplanation("");
    setSubject("");
    setClassLevel("");
    setTagsInput("");
    setMedium("bn");
    setVisibility("private");
    setShowForm(false);
  }

  function startEdit(item: QuestionBankItem) {
    setError(null);
    setMessage(null);
    setActiveTab("manual");
    setEditingId(item.id);
    setText(item.text);
    setOptions(Array.from({ length: FIXED_OPTIONS_COUNT }, (_, i) => item.options[i] ?? ""));
    setCorrectIndex(Math.min(item.correct_index, FIXED_OPTIONS_COUNT - 1));
    setExplanation(item.explanation ?? "");
    setSubject(item.subject);
    setClassLevel(item.class);
    setTagsInput(item.tags.join(", "));
    setMedium(item.medium);
    setVisibility(item.visibility);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const supabase = createClient();
    if (!supabase) return;

    const cleanText = text.trim();
    const cleanOptions = options.slice(0, FIXED_OPTIONS_COUNT).map((o) => o.trim());
    if (!cleanText || cleanOptions.length !== FIXED_OPTIONS_COUNT || cleanOptions.some((o) => !o)) {
      setError(
        t(
          "প্রশ্নের লেখা এবং ৪টি Option-ই পূরণ করা আবশ্যক।",
          "Question text and all 4 options are required.",
        ),
      );
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload = {
      text: cleanText,
      options: cleanOptions,
      correct_index: Math.min(correctIndex, FIXED_OPTIONS_COUNT - 1),
      explanation: explanation.trim() || null,
      subject: subject.trim(),
      class: classLevel.trim(),
      tags,
      medium,
      visibility,
    };

    setBusy(true);

    if (editingId) {
      const { data: updated, error: err } = await supabase
        .from("question_bank")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .single<QuestionBankItem>();
      setBusy(false);

      if (err || !updated) {
        setError(err?.message ?? t("প্রশ্ন আপডেট করা যায়নি।", "Failed to update question."));
        return;
      }

      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      setMessage(t("প্রশ্ন আপডেট হয়েছে।", "Question updated."));
      resetForm();
      router.refresh();
      return;
    }

    const { data: inserted, error: err } = await supabase
      .from("question_bank")
      .insert({
        ...payload,
        teacher_id: teacherId,
        source: "manual",
      })
      .select("*")
      .single<QuestionBankItem>();
    setBusy(false);

    if (err || !inserted) {
      setError(err?.message ?? t("প্রশ্ন যোগ করা যায়নি।", "Failed to add question."));
      return;
    }

    setItems((prev) => [inserted, ...prev]);
    setMessage(t("প্রশ্ন Question Bank-এ Save হয়েছে।", "Question saved to Question Bank."));
    resetForm();
    router.refresh();
  }

  async function handleGenerateWithAi(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setAiGenerating(true);

    const result = await generateAiDraftBatches({
      medium,
      classLevel,
      subject,
      requestedCount: Number(aiCount) || 5,
      notes: aiNotes,
      aiProvider,
      lang,
      onProgress: setAiProgress,
      onBatchDrafts: (batch) => {
        setDraftSource("ai");
        setDrafts((prev) => [...prev, ...batch]);
      },
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
      medium,
      lang,
      onProgress: setPdfProgress,
    });

    setPdfImporting(false);
    if (result.ok) {
      setDraftSource("pdf");
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
      if (!d.text.trim() || d.options.length !== FIXED_OPTIONS_COUNT || d.options.some((o) => !o.trim())) {
        setError(
          t(
            `Draft #${i + 1}-এ প্রশ্ন বা ৪টি Option সঠিকভাবে পূরণ করা নেই।`,
            `Draft #${i + 1} must have non-empty question text and 4 options.`,
          ),
        );
        return;
      }
    }

    const supabase = createClient();
    if (!supabase) return;

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setSavingDrafts(true);
    const { data: inserted, error: insertErr } = await supabase
      .from("question_bank")
      .insert(
        drafts.map((d) => ({
          teacher_id: teacherId,
          text: d.text.trim(),
          options: d.options.slice(0, FIXED_OPTIONS_COUNT).map((o) => o.trim()),
          correct_index: Math.min(d.correct_index, FIXED_OPTIONS_COUNT - 1),
          explanation: d.explanation?.trim() || null,
          subject: subject.trim(),
          class: classLevel.trim(),
          tags,
          medium,
          source: draftSource,
          visibility,
        })),
      )
      .select("*")
      .returns<QuestionBankItem[]>();

    setSavingDrafts(false);
    if (insertErr || !inserted) {
      setError(
        insertErr?.message ??
          t("Draft প্রশ্নগুলো Question Bank-এ Save করা যায়নি।", "Failed to save drafts to Question Bank."),
      );
      return;
    }

    setItems((prev) => [...inserted, ...prev]);
    setDrafts([]);
    setEditingDraftIdx(null);
    setMessage(
      t(
        `${inserted.length}টি প্রশ্ন Question Bank-এ Save হয়েছে।`,
        `Saved ${inserted.length} question(s) to Question Bank.`,
      ),
    );
    router.refresh();
  }

  async function handleToggleVisibility(item: QuestionBankItem) {
    if (item.teacher_id !== teacherId) return;
    const supabase = createClient();
    if (!supabase) return;
    const nextVis = item.visibility === "private" ? "shared" : "private";
    const { data: updated } = await supabase
      .from("question_bank")
      .update({ visibility: nextVis })
      .eq("id", item.id)
      .select("*")
      .single<QuestionBankItem>();

    if (updated) {
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      setMessage(
        updated.visibility === "shared"
          ? t("প্রশ্নটি সবার জন্য Shared করা হয়েছে।", "Question marked as Shared.")
          : t("প্রশ্নটি Private করা হয়েছে।", "Question marked as Private."),
      );
    }
  }

  async function handleDelete(item: QuestionBankItem) {
    if (item.teacher_id !== teacherId) {
      setPendingDeleteItem(null);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setPendingDeleteItem(null);
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.from("question_bank").delete().eq("id", item.id);
    setBusy(false);
    setPendingDeleteItem(null);
    if (!err) {
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
      setMessage(t("প্রশ্নটি Question Bank থেকে মুছে ফেলা হয়েছে।", "Question deleted from Question Bank."));
    } else {
      setError(err.message);
    }
  }

  async function handleBulkVisibility(nextVisibility: "shared" | "private") {
    if (selectedIds.length === 0) return;
    const supabase = createClient();
    if (!supabase) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: err } = await supabase
      .from("question_bank")
      .update({ visibility: nextVisibility })
      .in("id", selectedIds)
      .eq("teacher_id", teacherId);

    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }

    const idSet = new Set(selectedIds);
    setItems((prev) =>
      prev.map((it) => (idSet.has(it.id) ? { ...it, visibility: nextVisibility } : it)),
    );
    const count = selectedIds.length;
    setMessage(
      t(
        `${count}টি প্রশ্ন ${nextVisibility === "shared" ? "Shared" : "Private"} করা হয়েছে।`,
        `${count} question(s) marked as ${nextVisibility === "shared" ? "Shared" : "Private"}.`,
      ),
    );
    setSelectedIds([]);
    router.refresh();
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      setConfirmBulkDeleteOpen(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setConfirmBulkDeleteOpen(false);
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: err } = await supabase
      .from("question_bank")
      .delete()
      .in("id", selectedIds)
      .eq("teacher_id", teacherId);

    setBusy(false);
    setConfirmBulkDeleteOpen(false);
    if (err) {
      setError(err.message);
      return;
    }

    const idSet = new Set(selectedIds);
    const count = selectedIds.length;
    setItems((prev) => prev.filter((it) => !idSet.has(it.id)));
    setMessage(
      t(
        `${count}টি প্রশ্ন Question Bank থেকে মুছে ফেলা হয়েছে।`,
        `${count} question(s) deleted from Question Bank.`,
      ),
    );
    setSelectedIds([]);
    router.refresh();
  }

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const subj = subjectFilter.trim().toLowerCase();
    const cls = classFilter.trim().toLowerCase();

    return items.filter((item) => {
      if (scope === "mine" && item.teacher_id !== teacherId) return false;
      if (scope === "shared" && item.visibility !== "shared") return false;
      if (mediumFilter !== "all" && item.medium !== mediumFilter) return false;
      if (subj && !item.subject.toLowerCase().includes(subj)) return false;
      if (cls && !item.class.toLowerCase().includes(cls)) return false;
      if (kw) {
        const hay = `${item.text} ${item.subject} ${item.class} ${item.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [classFilter, items, keyword, mediumFilter, scope, subjectFilter, teacherId]);

  const ownFilteredIds = useMemo(
    () => filtered.filter((item) => item.teacher_id === teacherId).map((item) => item.id),
    [filtered, teacherId],
  );
  const mineCount = useMemo(
    () => items.filter((i) => i.teacher_id === teacherId).length,
    [items, teacherId],
  );

  const tabs: Array<{ id: BankSourceTab; label: string; icon?: React.ReactNode }> = [
    { id: "manual", label: t("Manual", "Manual") },
    {
      id: "paste",
      label: t("Bulk Paste", "Bulk Paste"),
      icon: <ClipboardPaste className="h-3.5 w-3.5 text-navy shrink-0" />,
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

  const batchMetadataBar = (includeClassSubject: boolean) => (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-2 lg:grid-cols-4">
      {includeClassSubject && (
        <>
          <SearchableSubjectSelect
            value={subject}
            onChange={setSubject}
            placeholder={t("Subject (বিষয়)", "Subject")}
          />
          <ClassSelect
            value={classLevel}
            onChange={setClassLevel}
            placeholder="Class / Level"
          />
        </>
      )}
      <select
        value={medium}
        onChange={(e) => setMedium(e.target.value as ExamMedium)}
        className="h-11 sm:h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm"
      >
        <option value="bn">{t("বাংলা", "Bangla")}</option>
        <option value="en">English</option>
      </select>
      <select
        value={visibility}
        onChange={(e) => setVisibility(e.target.value as "private" | "shared")}
        className="h-11 sm:h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm"
      >
        <option value="private">{t("Private (শুধু আমি)", "Private (Only me)")}</option>
        <option value="shared">{t("Shared (সবার জন্য)", "Shared (Everyone)")}</option>
      </select>
      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder={t("Tags (কমা দিয়ে, ঐচ্ছিক)", "Tags (comma separated, optional)")}
        className={`${includeClassSubject ? "sm:col-span-2 lg:col-span-4 " : ""}h-11 sm:h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm`}
      />
    </div>
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-600">
          {t(
            `মোট ${items.length}টি প্রশ্ন (${mineCount}টি আপনার)`,
            `${items.length} total questions (${mineCount} yours)`,
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>
            {showForm
              ? t("Form বন্ধ করুন", "Close Form")
              : t("নতুন প্রশ্ন যোগ করুন", "Add New Question")}
          </span>
        </button>
      </div>

      {showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {!editingId && (
            <div className="border-b border-slate-200 bg-slate-50 p-2 sm:px-4 sm:pt-3 sm:pb-0 space-y-2 sm:space-y-0">
              <div className="flex items-center justify-between px-1 sm:hidden">
                <span className="text-xs font-semibold text-slate-500">
                  {t("প্রশ্ন যোগ করুন", "Add Question")}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-[34px] px-1 text-xs font-semibold text-navy hover:underline cursor-pointer"
                >
                  {t("Form লুকান", "Hide Form")}
                </button>
              </div>
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
                <button
                  type="button"
                  onClick={resetForm}
                  className="hidden sm:inline-flex ml-auto shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {t("Form লুকান", "Hide Form")}
                </button>
              </div>
            </div>
          )}

          <div className="p-4 sm:p-6 space-y-4">
            {(activeTab === "manual" || editingId) && (
              <QuestionBankForm
                embedded
                editingId={editingId}
                text={text}
                options={options}
                correctIndex={correctIndex}
                explanation={explanation}
                subject={subject}
                classLevel={classLevel}
                tagsInput={tagsInput}
                medium={medium}
                visibility={visibility}
                busy={busy}
                onTextChange={setText}
                onOptionsChange={setOptions}
                onCorrectIndexChange={setCorrectIndex}
                onExplanationChange={setExplanation}
                onSubjectChange={setSubject}
                onClassChange={setClassLevel}
                onTagsChange={setTagsInput}
                onMediumChange={setMedium}
                onVisibilityChange={setVisibility}
                onCancel={resetForm}
                onSubmit={handleSave}
              />
            )}

            {activeTab === "paste" && !editingId && (
              <div className="space-y-4">
                {batchMetadataBar(true)}
                <BulkPasteTab
                  medium={medium}
                  optionCount={FIXED_OPTIONS_COUNT}
                  defaultMarks={1}
                  subject={subject}
                  classLevel={classLevel}
                  onError={(msg) => {
                    setMessage(null);
                    setError(msg);
                  }}
                  onDraftsAdded={(parsed) => {
                    setError(null);
                    setDraftSource("manual");
                    setDrafts((prev) => [...prev, ...parsed]);
                    setMessage(
                      t(
                        `${parsed.length}টি Draft তৈরি হয়েছে — নিচে যাচাই করে Bank-এ Save করুন।`,
                        `Created ${parsed.length} draft(s) — review and save to Bank below.`,
                      ),
                    );
                  }}
                />
              </div>
            )}

            {activeTab === "ai" && !editingId && (
              <div className="space-y-4">
                {hasAiKey && batchMetadataBar(false)}
                <AiGeneratorTab
                  returnToPath="/teacher/bank"
                  medium={medium}
                  optionCount={FIXED_OPTIONS_COUNT}
                  defaultMarks={1}
                  hasAiKey={hasAiKey}
                  aiProvider={aiProvider}
                  aiClassLevel={classLevel}
                  aiSubject={subject}
                  aiCount={aiCount}
                  aiNotes={aiNotes}
                  aiGenerating={aiGenerating}
                  aiProgress={aiProgress}
                  onClassChange={setClassLevel}
                  onSubjectChange={setSubject}
                  onCountChange={setAiCount}
                  onNotesChange={setAiNotes}
                  onGenerate={handleGenerateWithAi}
                />
              </div>
            )}

            {activeTab === "pdf" && !editingId && (
              <div className="space-y-4">
                {hasAiKey && batchMetadataBar(true)}
                <PdfImportTab
                  returnToPath="/teacher/bank"
                  hasAiKey={hasAiKey}
                  aiProvider={aiProvider}
                  pdfImporting={pdfImporting}
                  pdfProgress={pdfProgress}
                  onPdfSelect={handlePdfImport}
                />
              </div>
            )}
          </div>
        </section>
      )}

      <DraftReviewQueue
        drafts={drafts}
        medium={medium}
        editingDraftIdx={editingDraftIdx}
        showSaveToBankToggle={false}
        confirmLabel={t(
          `নিশ্চিত করে ${drafts.length}টি প্রশ্ন Bank-এ Save করুন`,
          `Confirm & Save ${drafts.length} Draft(s) to Bank`,
        )}
        savingDrafts={savingDrafts}
        onSetDrafts={setDrafts}
        onSetEditingDraftIdx={setEditingDraftIdx}
        onSaveAllDrafts={() => void handleSaveAllDrafts()}
        onDiscardAll={() => {
          setDrafts([]);
          setEditingDraftIdx(null);
        }}
      />

      {/* Search & Filter Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 grid gap-2.5 sm:gap-3 sm:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("কীওয়ার্ড দিয়ে খুঁজুন...", "Search keyword...")}
            className="h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-base sm:text-sm"
          />
        </div>
        <SearchableSubjectSelect
          value={subjectFilter}
          onChange={setSubjectFilter}
          allowCustom={false}
          placeholder="All Subjects"
          searchPlaceholder="Search subject..."
        />
        <ClassSelect
          value={classFilter}
          onChange={setClassFilter}
          allowCustom={false}
          placeholder="All Classes"
          searchPlaceholder="Search class..."
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={mediumFilter}
            onChange={(e) => setMediumFilter(e.target.value as "all" | ExamMedium)}
            className="h-11 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-base sm:text-sm"
          >
            <option value="all">{t("সব মাধ্যম", "All Media")}</option>
            <option value="bn">{t("বাংলা", "Bangla")}</option>
            <option value="en">English</option>
          </select>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as "all" | "mine" | "shared")}
            className="h-11 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-base sm:text-sm"
          >
            <option value="all">{t("সব প্রশ্ন", "All")}</option>
            <option value="mine">{t("আমার", "Mine")}</option>
            <option value="shared">{t("শেয়ার্ড", "Shared")}</option>
          </select>
        </div>
      </section>

      {/* Bulk Selection Actions */}
      {ownFilteredIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 sm:px-4 sm:py-2.5 text-xs">
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setSelectedIds(ownFilteredIds)}
              className={`min-h-[38px] sm:min-h-[34px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer ${
                selectedIds.length === 0 ? "col-span-2 sm:col-span-1" : ""
              }`}
            >
              {t(`সবগুলো নির্বাচন (${ownFilteredIds.length})`, `Select All (${ownFilteredIds.length})`)}
            </button>
            {selectedIds.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelectedIds([])}
                className="min-h-[38px] sm:min-h-[34px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {t("নির্বাচন মুছুন", "Clear Selection")}
              </button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 sm:border-t-0 sm:pt-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleBulkVisibility("shared")}
                className="inline-flex min-h-[38px] sm:min-h-[34px] items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span>{t(`Shared করুন (${selectedIds.length})`, `Share (${selectedIds.length})`)}</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleBulkVisibility("private")}
                className="inline-flex min-h-[38px] sm:min-h-[34px] items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>{t("Private করুন", "Make Private")}</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmBulkDeleteOpen(true)}
                className="col-span-2 sm:col-span-1 inline-flex min-h-[38px] sm:min-h-[34px] items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>{t(`মুছুন (${selectedIds.length})`, `Delete (${selectedIds.length})`)}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {t(
              "Question Bank-এ মিলে যায় এমন কোনো প্রশ্ন পাওয়া যায়নি।",
              "No questions in the Question Bank match your filters.",
            )}
          </div>
        ) : (
          filtered.slice(0, visibleCount).map((item) => (
            <QuestionBankCard
              key={item.id}
              item={item}
              isOwner={item.teacher_id === teacherId}
              selected={selectedIds.includes(item.id)}
              busy={busy}
              onSelectChange={(checked) => {
                setSelectedIds((prev) =>
                  checked ? [...prev, item.id] : prev.filter((id) => id !== item.id),
                );
              }}
              onToggleVisibility={() => void handleToggleVisibility(item)}
              onEdit={() => startEdit(item)}
              onRequestDelete={() => setPendingDeleteItem(item)}
            />
          ))
        )}
        {filtered.length > visibleCount && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + BANK_PAGE_SIZE)}
              className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs sm:text-sm font-semibold text-navy hover:bg-slate-50 cursor-pointer"
            >
              {t(
                `আরও দেখুন (${filtered.length - visibleCount}টি বাকি)`,
                `Load more (${filtered.length - visibleCount} remaining)`,
              )}
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={pendingDeleteItem !== null}
        title={t("প্রশ্ন মুছে ফেলবেন?", "Delete Question?")}
        message={t(
          "আপনার Question Bank থেকে এই প্রশ্নটি স্থায়ীভাবে মুছে ফেলতে চান?",
          "Permanently delete this question from your Question Bank?",
        )}
        confirmLabel={t("মুছে ফেলুন", "Delete")}
        busy={busy}
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={() => {
          if (pendingDeleteItem) void handleDelete(pendingDeleteItem);
        }}
      />

      <ConfirmModal
        open={confirmBulkDeleteOpen}
        title={t("নির্বাচিত প্রশ্নগুলো মুছে ফেলবেন?", "Delete Selected Questions?")}
        message={t(
          `আপনার Question Bank থেকে নির্বাচিত ${selectedIds.length}টি প্রশ্ন স্থায়ীভাবে মুছে ফেলতে চান?`,
          `Permanently delete ${selectedIds.length} selected question(s) from your Question Bank?`,
        )}
        confirmLabel={t("সবগুলো মুছুন", "Delete All Selected")}
        busy={busy}
        onCancel={() => setConfirmBulkDeleteOpen(false)}
        onConfirm={() => void handleBulkDelete()}
      />

      {selectedIds.length > 0 && (
        <div className="no-print fixed inset-x-3 bottom-[calc(4.1rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur sm:hidden text-xs">
          <span className="font-semibold text-navy shrink-0">
            {t(`${selectedIds.length}টি নির্বাচিত`, `${selectedIds.length} selected`)}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleBulkVisibility("shared")}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-800 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{t("Share", "Share")}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleBulkVisibility("private")}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{t("Private", "Private")}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmBulkDeleteOpen(true)}
              aria-label={t("নির্বাচিত মুছুন", "Delete selected")}
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-semibold text-rose-700 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

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
