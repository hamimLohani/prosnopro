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
