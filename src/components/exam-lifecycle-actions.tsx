"use client";

import { CopyPlus, Loader2, Lock, Rocket, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { ExamStatus } from "@/lib/types";
import { generateExamCode } from "@/lib/validation";

interface ExamLifecycleActionsProps {
  examId: string;
  status: ExamStatus;
  canPublish: boolean;
  forceCloseDefault: boolean;
}

export function ExamLifecycleActions({
  examId,
  status,
  canPublish,
  forceCloseDefault,
}: ExamLifecycleActionsProps) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"close" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPublished = status === "published";

  async function handlePublish() {
    setError(null);
    const supabase = createClient();
    if (!supabase) return;

    setBusy("publish");
    const { error: err } = await supabase
      .from("exams")
      .update({ status: "published" })
      .eq("id", examId);

    setBusy(null);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(`/teacher/exams/${examId}`);
    router.refresh();
  }

  async function handleClose() {
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setConfirmAction(null);
      return;
    }

    setBusy("close");
    const { error: err } = await supabase.rpc("close_exam_manually", {
      p_exam_id: examId,
      p_force_close_active: forceCloseDefault,
    });

    setBusy(null);
    setConfirmAction(null);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
  }

  async function handleDuplicate() {
    setError(null);
    const supabase = createClient();
    if (!supabase) return;

    setBusy("duplicate");
    const { data: newId, error: err } = await supabase.rpc("duplicate_exam", {
      p_exam_id: examId,
      p_new_code: generateExamCode(),
    });

    setBusy(null);
    if (err || !newId) {
      setError(err?.message ?? t("Exam ডুপ্লিকেট করা যায়নি।", "Could not duplicate exam."));
      return;
    }
    router.push(`/teacher/exams/${newId as string}`);
    router.refresh();
  }

  async function handleDelete() {
    setError(null);
    if (isPublished) {
      setConfirmAction(null);
      setError(
        t(
          "Live Exam সরাসরি Delete করা যাবে না — আগে Exam বন্ধ (Close) করুন।",
          "Live exams cannot be deleted directly — close the exam first.",
        ),
      );
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setConfirmAction(null);
      return;
    }

    setBusy("delete");
    const { error: err } = await supabase.from("exams").delete().eq("id", examId);

    setBusy(null);
    setConfirmAction(null);
    if (err) {
      setError(
        /close the exam before deleting/i.test(err.message)
          ? t(
              "Live Exam সরাসরি Delete করা যাবে না — আগে Exam বন্ধ (Close) করুন।",
              "Live exams cannot be deleted directly — close the exam first.",
            )
          : err.message,
      );
      return;
    }
    router.push("/teacher");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
        {status !== "published" && (
          <button
            type="button"
            disabled={!canPublish || busy !== null}
            onClick={handlePublish}
            className="col-span-2 sm:col-span-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
          >
            {busy === "publish" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            <span>
              {status === "closed"
                ? t("পুনরায় Publish করুন", "Re-publish Exam")
                : t("Exam Publish করুন", "Publish Exam")}
            </span>
          </button>
        )}

        {status === "published" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setConfirmAction("close")}
            className="col-span-2 sm:col-span-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
          >
            {busy === "close" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span>{t("Exam বন্ধ (Close) করুন", "Close Exam")}</span>
          </button>
        )}

        <button
          type="button"
          disabled={busy !== null}
          onClick={handleDuplicate}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
        >
          {busy === "duplicate" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CopyPlus className="h-4 w-4" />
          )}
          <span>{t("ডুপ্লিকেট করুন", "Duplicate")}</span>
        </button>

        <button
          type="button"
          disabled={busy !== null || isPublished}
          title={
            isPublished
              ? t(
                  "মুছতে চাইলে আগে Exam-টি Close (বন্ধ) করুন।",
                  "Close the exam before deleting it.",
                )
              : undefined
          }
          onClick={() => {
            if (!isPublished) setConfirmAction("delete");
          }}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {busy === "delete" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span>{t("মুছুন", "Delete")}</span>
        </button>
      </div>

      {isPublished && (
        <p className="text-xs text-slate-500">
          {t(
            "Live Exam সরাসরি মুছে ফেলা যাবে না — Delete করতে হলে আগে Exam বন্ধ (Close) করুন।",
            "Live exams cannot be deleted directly — close the exam first before deleting.",
          )}
        </p>
      )}

      <ConfirmModal
        open={confirmAction !== null}
        tone="danger"
        title={
          confirmAction === "close"
            ? t("Exam বন্ধ (Close) করবেন?", "Close Exam?")
            : t("Exam মুছে ফেলবেন?", "Delete Exam?")
        }
        message={
          confirmAction === "close"
            ? forceCloseDefault
              ? t(
                  "Exam বন্ধ করলে নতুন কোনো Student আর জয়েন করতে পারবে না এবং চলমান পরীক্ষাগুলো সাথে সাথে Submit হয়ে যাবে।",
                  "Closing this exam prevents new joins and immediately submits any in-progress attempts.",
                )
              : t(
                  "Exam বন্ধ করলে নতুন কোনো Student আর জয়েন করতে পারবে না।",
                  "Closing this exam prevents new students from joining.",
                )
            : t(
                "এই Exam এবং এর সব প্রশ্ন ও Student-দের Attempt মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।",
                "Delete this exam along with all its questions and student attempts? This cannot be undone.",
              )
        }
        confirmLabel={
          confirmAction === "close"
            ? t("হ্যাঁ, Exam বন্ধ করুন", "Yes, Close Exam")
            : t("Exam মুছুন", "Delete Exam")
        }
        busy={busy === "close" || busy === "delete"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction === "close") {
            void handleClose();
          } else if (confirmAction === "delete") {
            void handleDelete();
          }
        }}
      />
    </div>
  );
}
