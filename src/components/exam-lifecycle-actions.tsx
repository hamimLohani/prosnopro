"use client";

import { CopyPlus, Loader2, Lock, Rocket, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!supabase) return;

    setBusy("close");
    const { error: err } = await supabase.rpc("close_exam_manually", {
      p_exam_id: examId,
      p_force_close_active: forceCloseDefault,
    });

    setBusy(null);
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
      setError(err?.message ?? "Could not duplicate exam.");
      return;
    }
    router.push(`/teacher/exams/${newId as string}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm("Delete this exam and all its questions and attempts? This cannot be undone.")) {
      return;
    }
    setError(null);
    const supabase = createClient();
    if (!supabase) return;

    setBusy("delete");
    const { error: err } = await supabase.from("exams").delete().eq("id", examId);

    setBusy(null);
    if (err) {
      setError(err.message);
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
            <span>{status === "closed" ? "Re-open & Publish" : "Publish Exam"}</span>
          </button>
        )}

        {status === "published" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleClose}
            className="col-span-2 sm:col-span-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
          >
            {busy === "close" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span>Close Exam Manually</span>
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
          <span>Duplicate</span>
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={handleDelete}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
        >
          {busy === "delete" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
