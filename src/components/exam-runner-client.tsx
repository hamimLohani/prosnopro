"use client";

import { AlertTriangle, Flag, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExamRunnerHeader, type RunnerSyncState } from "@/components/exam-runner/exam-runner-header";
import { ExamSubmitModal, ExamTakeoverModal } from "@/components/exam-runner/exam-runner-modals";
import { useLang } from "@/components/language-provider";
import { MathText } from "@/components/math-text";
import { pickText } from "@/lib/i18n";
import { optionLabel } from "@/lib/mcq";
import type { ExamMedium, StudentExamQuestion, ViolationCounts } from "@/lib/types";

interface LocalizedMsg {
  bn: string;
  en: string;
}

interface StartAttemptPayload {
  ok: boolean;
  code?: string;
  server_now?: string;
  attempt?: {
    id: string;
    exam_id: string;
    student_name: string;
    student_roll: string | null;
    started_at: string;
    deadline_at: string;
    draft_answers: Record<string, number>;
    client_seq: number;
    violation_counts: ViolationCounts;
  };
  exam?: {
    id: string;
    name: string;
    subject: string;
    medium: ExamMedium;
    negative_marking: boolean;
    negative_value: number;
  };
  questions?: StudentExamQuestion[];
}

interface ExamRunnerClientProps {
  examId: string;
}

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function ExamRunnerClient({ examId }: ExamRunnerClientProps) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<LocalizedMsg | null>(null);
  const [takenOver, setTakenOver] = useState(false);

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState<string | null>(null);
  const [examInfo, setExamInfo] = useState<NonNullable<StartAttemptPayload["exam"]> | null>(null);
  const [questions, setQuestions] = useState<StudentExamQuestion[]>([]);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flaggedIds, setFlaggedIds] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [syncState, setSyncState] = useState<RunnerSyncState>("synced");
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sessionIdRef = useRef<string>("");
  const attemptIdRef = useRef<string | null>(null);
  const answersRef = useRef<Record<string, number>>({});
  const clientSeqRef = useRef<number>(0);
  const dirtyRef = useRef<boolean>(false);
  const violationsRef = useRef<ViolationCounts>({
    tab_switches: 0,
    blurs: 0,
    fullscreen_exits: 0,
    copy_attempts: 0,
    away_seconds: 0,
  });
  const awayStartedAtRef = useRef<number | null>(null);
  const deadlineMsRef = useRef<number>(0);
  const serverOffsetMsRef = useRef<number>(0);
  const submittingRef = useRef<boolean>(false);
  const takenOverRef = useRef<boolean>(false);
  const headerRef = useRef<HTMLElement | null>(null);

  const persistLocalDraft = useCallback((attId: string, nextAnswers: Record<string, number>, seq: number) => {
    try {
      localStorage.setItem(
        `prosnopro_draft_${attId}`,
        JSON.stringify({ answers: nextAnswers, clientSeq: seq }),
      );
    } catch {
      // Ignore storage quota errors on private browsing modes
    }
  }, []);

  const clearLocalDraft = useCallback((attId: string | null) => {
    if (!attId) return;
    try {
      localStorage.removeItem(`prosnopro_draft_${attId}`);
      localStorage.removeItem(`prosnopro_flags_${attId}`);
    } catch {
      // Ignore
    }
  }, []);

  const syncDraftToServer = useCallback(async (useBeacon = false) => {
    const attId = attemptIdRef.current;
    if (!attId || !sessionIdRef.current || takenOverRef.current || submittingRef.current) return;
    if (!dirtyRef.current) return;

    const payload = JSON.stringify({
      attemptId: attId,
      sessionId: sessionIdRef.current,
      draftAnswers: answersRef.current,
      clientSeq: clientSeqRef.current,
      violationCounts: violationsRef.current,
    });

    if (useBeacon && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/student/attempts/sync", blob);
      return;
    }

    setSyncState("syncing");
    try {
      const res = await fetch("/api/student/attempts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      const data = (await res.json()) as { ok?: boolean; code?: string };

      if (res.status === 409 && data.code === "SESSION_TAKEN_OVER") {
        takenOverRef.current = true;
        setTakenOver(true);
        return;
      }

      if (res.status === 409 && (data.code === "ALREADY_SUBMITTED" || data.code === "EXPIRED")) {
        clearLocalDraft(attId);
        router.replace(`/student/exams/${examId}/submitted`);
        return;
      }

      if (res.ok && data.ok) {
        dirtyRef.current = false;
        setSyncState("synced");
      } else {
        setSyncState("offline");
      }
    } catch {
      setSyncState("offline");
    }
  }, [clearLocalDraft, examId, router]);

  const submitExam = useCallback(async () => {
    const attId = attemptIdRef.current;
    if (!attId || submittingRef.current || takenOverRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setShowConfirmModal(false);

    try {
      const res = await fetch("/api/student/attempts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attId,
          sessionId: sessionIdRef.current,
          answers: answersRef.current,
          violationCounts: violationsRef.current,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; code?: string };

      if (res.status === 409 && data.code === "SESSION_TAKEN_OVER") {
        takenOverRef.current = true;
        setTakenOver(true);
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      if (res.ok && data.ok) {
        clearLocalDraft(attId);
        router.replace(`/student/exams/${examId}/submitted`);
        return;
      }

      submittingRef.current = false;
      setSubmitting(false);
      setFatalError({
        bn: "এই মুহূর্তে Submit করা যাচ্ছে না। অনুগ্রহ করে আবার Submit ট্যাপ করুন।",
        en: "Could not submit right now. Please tap Submit again.",
      });
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setFatalError({
        bn: "Submit করার সময় Network সমস্যা হয়েছে। আপনার উত্তর ফোনে Save আছে — আবার Submit ট্যাপ করুন।",
        en: "Network error while submitting. Your answers are saved locally — tap Submit to retry.",
      });
    }
  }, [clearLocalDraft, examId, router]);

  // Initial load / start / resume
  useEffect(() => {
    let active = true;
    const key = `prosnopro_sid_${examId}`;
    let sid = "";
    try {
      sid = sessionStorage.getItem(key) ?? "";
      if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem(key, sid);
      }
    } catch {
      sid = crypto.randomUUID();
    }
    sessionIdRef.current = sid;

    async function boot() {
      try {
        const res = await fetch("/api/student/attempts/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId, sessionId: sid }),
        });
        const data = (await res.json()) as StartAttemptPayload;

        if (!active) return;

        if (res.status === 409 && data.code === "ALREADY_SUBMITTED") {
          router.replace(`/student/exams/${examId}/submitted`);
          return;
        }

        if (!res.ok || !data.ok || !data.attempt || !data.exam || !data.questions) {
          setFatalError(
            data.code === "EXAM_CLOSED"
              ? { bn: "এই Exam-টি বন্ধ হয়ে গেছে।", en: "This exam is closed." }
              : data.code === "NO_QUESTIONS"
                ? { bn: "এই Exam-এ এখনো কোনো প্রশ্ন নেই।", en: "This exam has no questions yet." }
                : { bn: "Exam Attempt লোড করা যাচ্ছে না।", en: "Unable to load exam attempt." },
          );
          setLoading(false);
          return;
        }

        const att = data.attempt;
        const serverNowMs = data.server_now ? new Date(data.server_now).getTime() : Date.now();
        serverOffsetMsRef.current = serverNowMs - Date.now();
        deadlineMsRef.current = new Date(att.deadline_at).getTime();

        let initialAnswers = att.draft_answers ?? {};
        let initialSeq = att.client_seq ?? 0;

        // Recover any newer unsynced local clicks after weak-network reload
        try {
          const rawLocal = localStorage.getItem(`prosnopro_draft_${att.id}`);
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal) as {
              answers?: Record<string, number>;
              clientSeq?: number;
            };
            if (typeof parsed.clientSeq === "number" && parsed.clientSeq > initialSeq && parsed.answers) {
              initialAnswers = parsed.answers;
              initialSeq = parsed.clientSeq;
              dirtyRef.current = true;
            }
          }
        } catch {
          // Ignore malformed local draft
        }

        attemptIdRef.current = att.id;
        answersRef.current = initialAnswers;
        clientSeqRef.current = initialSeq;
        violationsRef.current = att.violation_counts ?? violationsRef.current;

        setAttemptId(att.id);
        setStudentName(att.student_name);
        setStudentRoll(att.student_roll);
        setExamInfo(data.exam);
        setQuestions(data.questions);
        setAnswers(initialAnswers);
        try {
          const rawFlags = localStorage.getItem(`prosnopro_flags_${att.id}`);
          if (rawFlags) {
            const parsedFlags = JSON.parse(rawFlags) as Record<string, boolean>;
            if (parsedFlags && typeof parsedFlags === "object") {
              setFlaggedIds(parsedFlags);
            }
          }
        } catch {
          // Ignore malformed flags
        }
        setSyncState(dirtyRef.current ? "unsaved" : "synced");

        const initialRemaining = Math.max(
          0,
          Math.floor((deadlineMsRef.current - (Date.now() + serverOffsetMsRef.current)) / 1000),
        );
        setRemainingSeconds(initialRemaining);
        setLoading(false);
      } catch {
        if (!active) return;
        setFatalError({
          bn: "Exam শুরু করার সময় Network সমস্যা হয়েছে। পেজটি Reload করুন।",
          en: "Network error while starting the exam. Please reload.",
        });
        setLoading(false);
      }
    }

    void boot();
    return () => {
      active = false;
    };
  }, [examId, router]);

  // Countdown + auto-submit + 35s dirty batch sync
  useEffect(() => {
    if (loading || !attemptId || takenOver) return;

    const tickInterval = setInterval(() => {
      const serverNow = Date.now() + serverOffsetMsRef.current;
      const secsLeft = Math.max(0, Math.floor((deadlineMsRef.current - serverNow) / 1000));
      setRemainingSeconds(secsLeft);
      if (secsLeft <= 0 && !submittingRef.current && !takenOverRef.current) {
        void submitExam();
      }
    }, 1000);

    const syncInterval = setInterval(() => {
      void syncDraftToServer(false);
    }, 35_000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(syncInterval);
    };
  }, [attemptId, loading, submitExam, syncDraftToServer, takenOver]);

  // Standard protection listeners + pagehide flush
  useEffect(() => {
    if (loading || !attemptId || takenOver) return;

    function bumpViolation(field: keyof ViolationCounts, delta = 1) {
      violationsRef.current = {
        ...violationsRef.current,
        [field]: (violationsRef.current[field] ?? 0) + delta,
      };
      dirtyRef.current = true;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        awayStartedAtRef.current = Date.now();
        bumpViolation("tab_switches", 1);
        void syncDraftToServer(true);
      } else if (awayStartedAtRef.current !== null) {
        const awaySec = Math.max(1, Math.round((Date.now() - awayStartedAtRef.current) / 1000));
        awayStartedAtRef.current = null;
        bumpViolation("away_seconds", awaySec);
      }
    }

    function handleBlur() {
      bumpViolation("blurs", 1);
    }

    function handleCopyOrCut(e: ClipboardEvent) {
      e.preventDefault();
      bumpViolation("copy_attempts", 1);
    }

    function handleContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "p", "s", "u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        bumpViolation("copy_attempts", 1);
      }
    }

    function handlePageHide() {
      void syncDraftToServer(true);
    }

    function handleOffline() {
      setSyncState("offline");
    }

    function handleOnline() {
      if (dirtyRef.current) {
        void syncDraftToServer(false);
      } else {
        setSyncState("synced");
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopyOrCut);
    document.addEventListener("cut", handleCopyOrCut);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopyOrCut);
      document.removeEventListener("cut", handleCopyOrCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [attemptId, loading, syncDraftToServer, takenOver]);

  function selectOption(questionId: string, canonicalIndex: number) {
    if (takenOver || submitting || !attemptId) return;
    const next = { ...answers, [questionId]: canonicalIndex };
    const nextSeq = clientSeqRef.current + 1;

    answersRef.current = next;
    clientSeqRef.current = nextSeq;
    dirtyRef.current = true;

    setAnswers(next);
    setSyncState("unsaved");
    persistLocalDraft(attemptId, next, nextSeq);
  }

  function toggleFlag(questionId: string) {
    if (takenOver || submitting || !attemptId) return;
    setFlaggedIds((prev) => {
      const next = { ...prev };
      if (next[questionId]) {
        delete next[questionId];
      } else {
        next[questionId] = true;
      }
      try {
        localStorage.setItem(`prosnopro_flags_${attemptId}`, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }

  function clearOption(questionId: string) {
    if (takenOver || submitting || !attemptId) return;
    if (!(questionId in answers)) return;

    const next = { ...answers };
    delete next[questionId];
    const nextSeq = clientSeqRef.current + 1;

    answersRef.current = next;
    clientSeqRef.current = nextSeq;
    dirtyRef.current = true;

    setAnswers(next);
    setSyncState("unsaved");
    persistLocalDraft(attemptId, next, nextSeq);
  }

  const answeredCount = useMemo(
    () => questions.filter((q) => typeof answers[q.id] === "number").length,
    [answers, questions],
  );

  const watermarkBg = useMemo(() => {
    const rollPart = studentRoll ? ` • ${studentRoll}` : "";
    const label = escapeXml(`${studentName}${rollPart}`.slice(0, 42));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="145" viewBox="0 0 230 145"><g transform="translate(115 72) rotate(-18)" fill="#162456" text-anchor="middle" font-family="system-ui, sans-serif"><text y="-4" font-size="11" font-weight="800" letter-spacing="1.4">PROSNOPRO</text><text y="12" font-size="10" font-weight="600">${label}</text></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [studentName, studentRoll]);

  useEffect(() => {
    if (!showNavDrawer) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowNavDrawer(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showNavDrawer]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-navy" />
        <span>{t("Exam-এর প্রশ্ন লোড হচ্ছে...", "Loading exam questions...")}</span>
      </div>
    );
  }

  if (fatalError && !examInfo) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4">
        <h1 className="text-xl font-bold text-navy">
          {t("Exam খোলা যাচ্ছে না", "Cannot Open Exam")}
        </h1>
        <p className="text-sm text-slate-600">{t(fatalError.bn, fatalError.en)}</p>
        <Link
          href="/student"
          className="inline-block rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          {t("Student Dashboard-এ ফিরে যান", "Back to Student Dashboard")}
        </Link>
      </div>
    );
  }

  const medium = examInfo?.medium ?? "bn";
  const isLowTime = remainingSeconds <= 120;
  const nextUnansweredIdx = questions.findIndex((q) => typeof answers[q.id] !== "number");
  const nextUnansweredQuestion = nextUnansweredIdx >= 0 ? questions[nextUnansweredIdx] : null;

  function jumpToQuestion(questionId: string) {
    setShowNavDrawer(false);
    // Wait for the mobile nav drawer to collapse and relayout before measuring scroll offset.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`question-${questionId}`);
        if (!el) return;
        const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 72;
        const targetTop = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: "smooth",
        });
      });
    });
  }

  return (
    <>
      <div className="hidden print:block p-10 text-center text-sm font-semibold text-slate-800">
        {t(
          "ProsnoPro Exam চলাকালে Print করা বন্ধ থাকে।",
          "Printing is disabled while a ProsnoPro exam is active.",
        )}
      </div>

      <div className="no-print relative min-h-screen select-none [-webkit-touch-callout:none] pb-32 sm:pb-12">
        {/* Lightweight CSS repeating ProsnoPro + student identity watermark */}
        <div
          aria-hidden="true"
          style={{ backgroundImage: watermarkBg, backgroundRepeat: "repeat" }}
          className="pointer-events-none fixed inset-0 z-10 opacity-[0.07]"
        />

        <ExamTakeoverModal open={takenOver} />

        <ExamSubmitModal
          open={showConfirmModal}
          submitting={submitting}
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          flaggedCount={Object.keys(flaggedIds).length}
          isOffline={syncState === "offline"}
          onConfirm={() => void submitExam()}
          onCancel={() => setShowConfirmModal(false)}
        />

        <ExamRunnerHeader
          headerRef={headerRef}
          examName={examInfo?.name ?? ""}
          answeredCount={answeredCount}
          questions={questions}
          answers={answers}
          flaggedIds={flaggedIds}
          nextUnansweredQuestion={nextUnansweredQuestion}
          nextUnansweredIdx={nextUnansweredIdx}
          syncState={syncState}
          remainingSeconds={remainingSeconds}
          isLowTime={isLowTime}
          showNavDrawer={showNavDrawer}
          submitting={submitting}
          onToggleDrawer={() => setShowNavDrawer((v) => !v)}
          onCloseDrawer={() => setShowNavDrawer(false)}
          onJumpToQuestion={jumpToQuestion}
          onOpenSubmit={() => setShowConfirmModal(true)}
        />

        {fatalError && (
          <div className="mx-auto mt-4 max-w-5xl px-3 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{t(fatalError.bn, fatalError.en)}</span>
              </span>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitExam()}
                className="min-h-[38px] rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 cursor-pointer"
              >
                {t("আবার Submit চেষ্টা করুন", "Retry Submit")}
              </button>
            </div>
          </div>
        )}

        {/* Main Content + Desktop Navigator */}
        <div className="mx-auto grid max-w-5xl gap-5 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 lg:grid-cols-[1fr_240px]">
          <div className="min-w-0 space-y-3.5 sm:space-y-4">
            {questions.map((q, idx) => {
              const selected = answers[q.id];
              const isQuestionAnswered = typeof selected === "number";
              return (
                <article
                  key={q.id}
                  id={`question-${q.id}`}
                  className={`scroll-mt-20 sm:scroll-mt-24 rounded-2xl border bg-white p-4 sm:p-5 space-y-3.5 transition-colors ${
                    isQuestionAnswered ? "border-navy/30" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-[15px] font-semibold leading-relaxed text-slate-900 break-words sm:text-base">
                      <span className="mr-1.5 text-navy">{idx + 1}.</span>
                      <MathText text={q.text} />
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFlag(q.id)}
                        aria-pressed={Boolean(flaggedIds[q.id])}
                        title={t("পুনরায় দেখার জন্য চিহ্নিত করুন", "Flag for review")}
                        className={`inline-flex min-h-[38px] min-w-[38px] sm:min-h-[32px] sm:min-w-0 items-center justify-center gap-1 rounded-lg border px-2.5 sm:px-2 py-1 text-xs font-medium transition cursor-pointer ${
                          flaggedIds[q.id]
                            ? "border-amber-300 bg-amber-50 text-amber-900"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        <Flag className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">
                          {flaggedIds[q.id] ? t("চিহ্নিত", "Flagged") : t("চিহ্নিত করুন", "Flag")}
                        </span>
                      </button>
                      <span className="text-xs font-medium text-slate-500">
                        {t(`${q.marks} নম্বর`, `${q.marks} pts`)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {q.options.map((opt, displayIdx) => {
                      const isSelected = selected === opt.canonicalIndex;
                      return (
                        <button
                          key={opt.canonicalIndex}
                          type="button"
                          onClick={() => selectOption(q.id, opt.canonicalIndex)}
                          className={`flex min-h-[48px] w-full items-center sm:items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[15px] sm:text-sm transition active:scale-[0.99] cursor-pointer ${
                            isSelected
                              ? "border-navy bg-navy/5 font-medium text-navy ring-1 ring-navy"
                              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`sm:mt-0.5 flex h-7 w-7 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                              isSelected
                                ? "border-navy bg-navy text-white"
                                : "border-slate-300 text-slate-600"
                            }`}
                          >
                            {optionLabel(displayIdx, medium)}
                          </span>
                          <span className="flex-1 leading-relaxed break-words">
                            <MathText text={opt.text} />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {isQuestionAnswered && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => clearOption(q.id)}
                        className="min-h-[40px] sm:min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                      >
                        {t("উত্তর মুছুন", "Clear Answer")}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-navy">Question Navigator</h2>
                <p className="text-xs text-slate-500">
                  {t(
                    `${questions.length}টির মধ্যে ${answeredCount}টি উত্তর দেওয়া হয়েছে`,
                    `${answeredCount} of ${questions.length} answered`,
                  )}
                </p>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, idx) => {
                  const answered = typeof answers[q.id] === "number";
                  const flagged = Boolean(flaggedIds[q.id]);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => jumpToQuestion(q.id)}
                      className={`h-8 rounded-lg text-xs font-semibold cursor-pointer ${
                        answered && flagged
                          ? "border-2 border-amber-400 bg-navy text-white"
                          : flagged
                            ? "border border-amber-400 bg-amber-100 text-amber-900"
                            : answered
                              ? "bg-navy text-white"
                              : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              {Object.keys(flaggedIds).length > 0 && (
                <p className="text-[11px] font-medium text-amber-800">
                  {t(
                    `হলুদ চিহ্নিত: ${Object.keys(flaggedIds).length}টি প্রশ্ন পুনরায় দেখার জন্য রাখা হয়েছে`,
                    `Flagged: ${Object.keys(flaggedIds).length} question(s) marked for review`,
                  )}
                </p>
              )}
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{t("Exam Submit করুন", "Submit Exam")}</span>
              </button>
            </div>
          </aside>
        </div>

        {/* Mobile Bottom Submit Bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                {t(
                  `${answeredCount}/${questions.length}টি উত্তর`,
                  `${answeredCount}/${questions.length} answered`,
                )}
              </span>
              {nextUnansweredQuestion ? (
                <button
                  type="button"
                  onClick={() => jumpToQuestion(nextUnansweredQuestion.id)}
                  className="inline-flex min-h-[38px] items-center rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 active:bg-amber-100 cursor-pointer"
                >
                  {t(`পরবর্তী #${nextUnansweredIdx + 1}`, `Next #${nextUnansweredIdx + 1}`)}
                </button>
              ) : (
                <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  {t("সব উত্তর সম্পন্ন", "All Answered")}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowConfirmModal(true)}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.99] cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>{t("জমা দিন", "Submit")}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
