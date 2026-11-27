import assert from "node:assert/strict";
import test from "node:test";
import { parseAndValidateQuestionsJson } from "../src/lib/ai/schema.ts";

test("parseAndValidateQuestionsJson extracts fenced Bangla + KaTeX JSON and drops invalid items", () => {
  const raw = `Here are the questions:
\`\`\`json
{
  "questions": [
    {
      "text": "বেগের একক কোনটি? ($v = \\\\frac{s}{t}$)",
      "options": ["m/s", "m/s^2", "kg", "N"],
      "correct_index": 0,
      "explanation": "সরণ ও সময়ের অনুপাত।",
      "marks": 2
    },
    {
      "text": "Invalid option count",
      "options": ["Only A", "Only B"],
      "correct_index": 0
    },
    {
      "text": "Out of bounds index",
      "options": ["A", "B", "C", "D"],
      "correct_index": 5
    }
  ]
}
\`\`\``;

  const parsed = parseAndValidateQuestionsJson(raw, 4, 1);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].correct_index, 0);
  assert.equal(parsed[0].marks, 2);
  assert.match(parsed[0].text, /বেগের একক/);
});

test("parseAndValidateQuestionsJson throws when no valid questions remain", () => {
  assert.throws(() => parseAndValidateQuestionsJson('{"questions": []}', 4, 1));
});
