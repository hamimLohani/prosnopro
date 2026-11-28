import assert from "node:assert/strict";
import test from "node:test";
import { parseBulkMcqText } from "../src/lib/bulk-mcq.ts";

test("parseBulkMcqText parses Bangla and English MCQ blocks into drafts", () => {
  const input = `
1. বাংলাদেশের রাজধানী কোথায়?
ক) চট্টগ্রাম
খ) ঢাকা
গ) খুলনা
ঘ) রাজশাহী
Ans: খ

2. What is 2 + 2?
A) 3
*B) 4
C) 5
D) 6
Explanation: Basic addition
  `;

  const drafts = parseBulkMcqText(input, 4, 1);
  assert.equal(drafts.length, 2);

  assert.equal(drafts[0].text, "বাংলাদেশের রাজধানী কোথায়?");
  assert.deepEqual(drafts[0].options, ["চট্টগ্রাম", "ঢাকা", "খুলনা", "রাজশাহী"]);
  assert.equal(drafts[0].correct_index, 1);

  assert.equal(drafts[1].text, "What is 2 + 2?");
  assert.equal(drafts[1].correct_index, 1);
  assert.equal(drafts[1].explanation, "Basic addition");
});

test("parseBulkMcqText supports optional Ex: prefix for explanations", () => {
  const input = `
1. Which gas is most abundant in Earth's atmosphere?
A) Oxygen
B) Nitrogen
C) Carbon dioxide
D) Argon
Ans: B
Ex: Nitrogen makes up about 78% of Earth's atmosphere.
  `;

  const drafts = parseBulkMcqText(input, 4, 1);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].correct_index, 1);
  assert.equal(drafts[0].explanation, "Nitrogen makes up about 78% of Earth's atmosphere.");
});

test("parseBulkMcqText supports 2, 3, and 5 options plus Bangla answer tokens", () => {
  const twoOpt = `
1. Water boils at 100°C at sea level.
A) True
B) False
Ans: A
  `;
  const drafts2 = parseBulkMcqText(twoOpt, 2, 1);
  assert.equal(drafts2.length, 1);
  assert.deepEqual(drafts2[0].options, ["True", "False"]);
  assert.equal(drafts2[0].correct_index, 0);

  const threeOpt = `
1. কোনটি মৌলিক সংখ্যা?
ক) ৪
খ) ৭
গ) ৯
উত্তর: খ
  `;
  const drafts3 = parseBulkMcqText(threeOpt, 3, 2);
  assert.equal(drafts3.length, 1);
  assert.deepEqual(drafts3[0].options, ["৪", "৭", "৯"]);
  assert.equal(drafts3[0].correct_index, 1);
  assert.equal(drafts3[0].marks, 2);

  const fiveOpt = `
1. Pick the fifth letter:
A) A
B) B
C) C
D) D
E) E
Ans: E
  `;
  const drafts5 = parseBulkMcqText(fiveOpt, 5, 1);
  assert.equal(drafts5.length, 1);
  assert.equal(drafts5[0].options.length, 5);
  assert.equal(drafts5[0].correct_index, 4);
});

test("parseBulkMcqText skips malformed blocks without enough options", () => {
  const malformed = `
1. Incomplete question?
A) Only one option
Ans: A
  `;
  const drafts = parseBulkMcqText(malformed, 4, 1);
  assert.equal(drafts.length, 0);
});
