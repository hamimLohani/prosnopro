"use client";

import {
  CheckCircle2,
  Globe,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ClassSelect } from "@/components/class-select";
import { ConfirmModal } from "@/components/confirm-modal";
import { useLang } from "@/components/language-provider";
import { SearchableSubjectSelect } from "@/components/searchable-subject-select";
import { MathText } from "@/components/math-text";
import { pickText } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { ExamMedium, QuestionBankItem } from "@/lib/types";

interface QuestionBankManagerProps {
  teacherId: string;
  initialItems: QuestionBankItem[];
}

const BANK_PAGE_SIZE = 30;

export function QuestionBankManager({ teacherId, initialItems }: QuestionBankManagerProps) {
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

  // Create / Edit form
  const [showForm, setShowForm] = useState(false);
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
    setEditingId(item.id);
    setText(item.text);
    setOptions(item.options);
    setCorrectIndex(item.correct_index);
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
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!cleanText || cleanOptions.length < 2) {
      setError(
        t(
          "প্রশ্নের লেখা এবং কমপক্ষে ২টি Option আবশ্যক।",
          "Question text and at least 2 options are required.",
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
      correct_index: Math.min(correctIndex, cleanOptions.length - 1),
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

      {showForm && (
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4"
        >
          <h2 className="text-base font-bold text-navy">
            {editingId
              ? t("Bank-এর প্রশ্ন Edit করুন", "Edit Question Bank Item")
              : t("Question Bank-এ নতুন প্রশ্ন", "New Question Bank Item")}
          </h2>

          <textarea
            rows={2}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t(
              "প্রশ্নের লেখা (বাংলা বা English, $...$ দিয়ে গণিতের সূত্র লেখা যাবে)",
              "Question text (Bangla or English; use $...$ for math formulas)",
            )}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm"
          />

          <div className="grid gap-2.5 sm:grid-cols-2">
            {options.map((opt, idx) => (
              <div
                key={idx}
                className={`flex min-h-[44px] items-center gap-2.5 rounded-lg border px-2.5 py-2 ${
                  correctIndex === idx ? "border-emerald-400 bg-emerald-50/60" : "border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="bank-correct"
                  checked={correctIndex === idx}
                  onChange={() => setCorrectIndex(idx)}
                  className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-emerald-600 cursor-pointer"
                />
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx] = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={t(`অপশন ${idx + 1}`, `Option ${idx + 1}`)}
                  className="w-full bg-transparent text-base sm:text-sm focus:outline-none"
                />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t(
                "Tag (কমা দিয়ে, যেমন: mechanics, chapter-4)",
                "Tags (comma separated, e.g. mechanics, chapter-4)",
              )}
              className="h-11 sm:h-[42px] rounded-lg border border-slate-300 px-3 text-base sm:text-sm"
            />
            <input
              type="text"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder={t("ব্যাখ্যা / Explanation (ঐচ্ছিক)", "Explanation (optional)")}
              className="h-11 sm:h-[42px] rounded-lg border border-slate-300 px-3 text-base sm:text-sm"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[44px] w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              {t("বাতিল", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong cursor-pointer"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {editingId ? t("Update করুন", "Update Question") : t("প্রশ্ন Save করুন", "Save Question")}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 grid gap-2.5 sm:gap-3 sm:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search keyword..."
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
            className="h-11 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm sm:text-xs"
          >
            <option value="all">All Media</option>
            <option value="bn">Bangla</option>
            <option value="en">English</option>
          </select>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as "all" | "mine" | "shared")}
            className="h-11 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm sm:text-xs"
          >
            <option value="all">All</option>
            <option value="mine">Mine</option>
            <option value="shared">Shared</option>
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
          filtered.slice(0, visibleCount).map((item) => {
            const isOwner = item.teacher_id === teacherId;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-2.5"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {isOwner && (
                        <input
                          type="checkbox"
                          aria-label={t("প্রশ্ন নির্বাচন করুন", "Select question")}
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, item.id]
                                : prev.filter((id) => id !== item.id),
                            );
                          }}
                          className="mr-1 h-4 w-4 rounded border-slate-300 text-navy cursor-pointer"
                        />
                      )}
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                        {item.medium === "bn" ? t("বাংলা", "Bangla") : "English"}
                      </span>
                      {item.subject && (
                        <span className="rounded bg-navy/10 px-2 py-0.5 font-medium text-navy">
                          {item.subject}
                        </span>
                      )}
                      {item.class && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                          {item.class}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold ${
                          item.visibility === "shared"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.visibility === "shared" ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {item.visibility === "shared" ? "Shared" : "Private"}
                      </span>
                    </div>

                    {isOwner && (
                      <div className="ml-auto flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(item)}
                          title={t("Private / Shared পরিবর্তন করুন", "Toggle Private / Shared")}
                          className="min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-medium text-navy hover:bg-slate-100 cursor-pointer"
                        >
                          {item.visibility === "shared"
                            ? t("Private করুন", "Make Private")
                            : t("Share করুন", "Share")}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          title="Edit"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPendingDeleteItem(item)}
                          title="Delete"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-[15px] sm:text-sm font-semibold leading-relaxed text-slate-900 break-words">
                    <MathText text={item.text} />
                  </p>
                </div>

                <div className="grid gap-1.5 sm:grid-cols-2 text-[13px] sm:text-xs">
                  {item.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 ${
                        idx === item.correct_index
                          ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-900"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {idx === item.correct_index && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span className="min-w-0 break-words">
                        <MathText text={opt} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
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
    </div>
  );
}
