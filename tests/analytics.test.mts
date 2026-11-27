import assert from "node:assert/strict";
import test from "node:test";
import { computeExamAnalytics, formatTimeTaken } from "../src/lib/analytics.ts";
import type { AttemptDetail, Question } from "../src/lib/types.ts";

test("computeExamAnalytics calculates scores, percent correct, and most chosen wrong option", () => {
  const questions: Question[] = [
    {
      id: "q1",
      exam_id: "e1",
      position: 0,
      text: "Q1",
      options: ["A", "B", "C", "D"],
      correct_index: 1,
      explanation: null,
      marks: 2,
      bank_id: null,
      created_at: "2026-11-27T00:00:00Z",
    },
  ];

  const attempts: AttemptDetail[] = [
    {
      id: "a1",
      exam_id: "e1",
      student_id: "s1",
      student_name: "Alice",
      student_roll: "1",
      started_at: "2026-11-27T00:00:00Z",
      deadline_at: "2026-11-27T00:30:00Z",
      submitted_at: "2026-11-27T00:05:10Z",
      status: "submitted",
      answers: { q1: 1 },
      draft_answers: { q1: 1 },
      score: 2,
      total_marks: 2,
      violation_counts: { tab_switches: 0, blurs: 0, fullscreen_exits: 0, copy_attempts: 0, away_seconds: 0 },
    },
    {
      id: "a2",
      exam_id: "e1",
      student_id: "s2",
      student_name: "Bob",
      student_roll: "2",
      started_at: "2026-11-27T00:00:00Z",
      deadline_at: "2026-11-27T00:30:00Z",
      submitted_at: "2026-11-27T00:10:00Z",
      status: "auto_submitted",
      answers: { q1: 2 },
      draft_answers: { q1: 2 },
      score: 0,
      total_marks: 2,
      violation_counts: { tab_switches: 1, blurs: 1, fullscreen_exits: 0, copy_attempts: 0, away_seconds: 5 },
    },
    {
      id: "a3",
      exam_id: "e1",
      student_id: "s3",
      student_name: "Carol",
      student_roll: "3",
      started_at: "2026-11-27T00:00:00Z",
      deadline_at: "2026-11-27T00:30:00Z",
      submitted_at: "2026-11-27T00:12:00Z",
      status: "submitted",
      answers: { q1: 2 },
      draft_answers: { q1: 2 },
      score: 0,
      total_marks: 2,
      violation_counts: { tab_switches: 0, blurs: 0, fullscreen_exits: 0, copy_attempts: 0, away_seconds: 0 },
    },
  ];

  const summary = computeExamAnalytics(questions, attempts);
  assert.equal(summary.submittedCount, 3);
  assert.equal(summary.highestScore, 2);
  assert.equal(summary.lowestScore, 0);
  assert.equal(summary.perQuestion[0].correctCount, 1);
  assert.equal(summary.perQuestion[0].mostChosenWrongIndex, 2);
  assert.equal(summary.perQuestion[0].mostChosenWrongCount, 2);
  assert.equal(formatTimeTaken(attempts[0].started_at, attempts[0].submitted_at), "5m 10s");
});
