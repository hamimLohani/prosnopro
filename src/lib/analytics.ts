import type { AttemptDetail, Question } from "@/lib/types";

export interface QuestionAnalytics {
  questionId: string;
  position: number;
  text: string;
  marks: number;
  options: string[];
  correctIndex: number;
  optionCounts: number[];
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  percentCorrect: number;
  mostChosenWrongIndex: number | null;
  mostChosenWrongCount: number;
}

export interface ExamAnalyticsSummary {
  totalAttempts: number;
  inProgressCount: number;
  submittedCount: number;
  averageScore: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  averagePercentage: number | null;
  totalMarks: number;
  perQuestion: QuestionAnalytics[];
}

export function formatTimeTaken(startedAt: string, submittedAt: string | null): string {
  if (!submittedAt) return "—";
  const diffSec = Math.max(
    0,
    Math.round((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000),
  );
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${mins}m ${secs}s`;
}

export function computeExamAnalytics(
  questions: Question[],
  attempts: AttemptDetail[],
): ExamAnalyticsSummary {
  const totalMarks = questions.reduce((sum, q) => sum + Number(q.marks), 0);
  const submittedAttempts = attempts.filter(
    (a) => a.status === "submitted" || a.status === "auto_submitted",
  );
  const inProgressCount = attempts.length - submittedAttempts.length;

  const scores = submittedAttempts
    .map((a) => (a.score !== null ? Number(a.score) : null))
    .filter((s): s is number => s !== null);

  const averageScore =
    scores.length > 0
      ? Number((scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(2))
      : null;
  const highestScore = scores.length > 0 ? Math.max(...scores) : null;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : null;
  const averagePercentage =
    averageScore !== null && totalMarks > 0
      ? Number(((averageScore / totalMarks) * 100).toFixed(1))
      : null;

  const perQuestion: QuestionAnalytics[] = questions.map((q) => {
    const optionCounts = Array.from({ length: q.options.length }, () => 0);
    let answeredCount = 0;
    let correctCount = 0;

    for (const att of submittedAttempts) {
      const answerMap = att.answers ?? att.draft_answers ?? {};
      const chosen = answerMap[q.id];
      if (typeof chosen === "number" && chosen >= 0 && chosen < q.options.length) {
        optionCounts[chosen] += 1;
        answeredCount += 1;
        if (chosen === q.correct_index) {
          correctCount += 1;
        }
      }
    }

    let mostChosenWrongIndex: number | null = null;
    let mostChosenWrongCount = 0;
    optionCounts.forEach((count, idx) => {
      if (idx !== q.correct_index && count > mostChosenWrongCount) {
        mostChosenWrongCount = count;
        mostChosenWrongIndex = idx;
      }
    });

    const unansweredCount = submittedAttempts.length - answeredCount;
    const percentCorrect =
      submittedAttempts.length > 0
        ? Number(((correctCount / submittedAttempts.length) * 100).toFixed(1))
        : 0;

    return {
      questionId: q.id,
      position: q.position,
      text: q.text,
      marks: Number(q.marks),
      options: q.options,
      correctIndex: q.correct_index,
      optionCounts,
      answeredCount,
      unansweredCount,
      correctCount,
      percentCorrect,
      mostChosenWrongIndex,
      mostChosenWrongCount,
    };
  });

  return {
    totalAttempts: attempts.length,
    inProgressCount,
    submittedCount: submittedAttempts.length,
    averageScore,
    highestScore,
    lowestScore,
    averagePercentage,
    totalMarks,
    perQuestion,
  };
}
