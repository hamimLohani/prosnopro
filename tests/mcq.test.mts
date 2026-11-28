import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAttemptStatus,
  formatEntryEventType,
  formatExamStatus,
  optionLabel,
} from "../src/lib/mcq.ts";

test("optionLabel formats Bangla and English indices properly", () => {
  assert.equal(optionLabel(0, "bn"), "ক");
  assert.equal(optionLabel(3, "bn"), "ঘ");
  assert.equal(optionLabel(7, "bn"), "8");
  assert.equal(optionLabel(0, "en"), "A");
  assert.equal(optionLabel(3, "en"), "D");
});

test("status formatters localize cleanly without leaking raw underscores", () => {
  assert.equal(formatAttemptStatus("in_progress", "en"), "In Progress");
  assert.equal(formatAttemptStatus("in_progress", "bn"), "চলমান");
  assert.equal(formatAttemptStatus("auto_submitted", "en"), "Auto Submitted");
  assert.equal(formatExamStatus("published", "en"), "Published");
  assert.equal(formatEntryEventType("second_device", "en"), "Second Device");
});
