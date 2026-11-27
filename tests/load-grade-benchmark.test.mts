import assert from "node:assert/strict";
import test from "node:test";
import { computeExamAnalytics } from "../src/lib/analytics.ts";
import type { AttemptDetail, Question } from "../src/lib/types.ts";

test("analytics handles 1,000 attempts x 100 questions rapidly", () => {
  const questions: Question[] = Array.from({ length: 100 }, (_, i) => ({
    id: `q-${i}`,
    exam_id: "e-load",
    position: i,
    text: `Question ${i}`,
    options: ["A", "B", "C", "D"],
    correct_index: i % 4,
    explanation: null,
    marks: 1,
    bank_id: null,
    created_at: "2026-11-27T00:00:00Z",
  }));

  const attempts: AttemptDetail[] = Array.from({ length: 1000 }, (_, s) => {
    const answers: Record<string, number> = {};
    let score = 0;
    for (let q = 0; q < 100; q += 1) {
      const pick = (s + q) % 4;
      answers[`q-${q}`] = pick;
      if (pick === q % 4) score += 1;
    }
    return {
      id: `a-${s}`,
      exam_id: "e-load",
      student_id: `s-${s}`,
      student_name: `Student ${s}`,
      student_roll: String(s + 1),
      started_at: "2026-11-27T00:00:00Z",
      deadline_at: "2026-11-27T01:00:00Z",
      submitted_at: "2026-11-27T00:40:00Z",
      status: "submitted",
      answers,
      draft_answers: answers,
      score,
      total_marks: 100,
      violation_counts: {
        tab_switches: 0,
        blurs: 0,
        fullscreen_exits: 0,
        copy_attempts: 0,
        away_seconds: 0,
      },
    };
  });

  const t0 = performance.now();
  const summary = computeExamAnalytics(questions, attempts);
  const elapsedMs = performance.now() - t0;

  assert.equal(summary.submittedCount, 1000);
  assert.equal(summary.perQuestion.length, 100);
  assert.ok(elapsedMs < 1000, `Expected < 1000ms, took ${elapsedMs.toFixed(1)}ms`);
});
