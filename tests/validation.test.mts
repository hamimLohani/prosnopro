import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeBanglaPdfText,
  generateExamCode,
  isValidExamCode,
  isValidTeacherCode,
  localizeJoinError,
  normalizeExamCode,
  normalizeTeacherCode,
} from "../src/lib/validation.ts";

test("teacher and exam code normalization and validation", () => {
  assert.equal(normalizeTeacherCode("  rahim26 "), "RAHIM26");
  assert.equal(isValidTeacherCode("rahim26"), true);
  assert.equal(isValidTeacherCode("ab"), false);
  assert.equal(isValidTeacherCode("too_long_code_123"), false);
  assert.equal(isValidTeacherCode("BAD-1"), false);

  assert.equal(normalizeExamCode(" phy01 "), "PHY01");
  assert.equal(isValidExamCode("PHY01"), true);
  assert.equal(isValidExamCode("AB"), false);

  const generated = generateExamCode(6);
  assert.equal(generated.length, 6);
  assert.equal(isValidExamCode(generated), true);
});

test("analyzeBanglaPdfText detects Unicode Bangla, English, Bijoy, and empty scanned PDFs", () => {
  const unicodeBangla = analyzeBanglaPdfText(
    "বাংলা সাহিত্যের প্রাচীনতম নিদর্শন চর্যাপদ কোন ছন্দে রচিত? সঠিক উত্তর নির্বাচন করুন।",
  );
  assert.equal(unicodeBangla.classification, "unicode-bangla");
  assert.equal(unicodeBangla.suspectLegacyBijoy, false);

  const english = analyzeBanglaPdfText(
    "Newton's second law states that force equals mass multiplied by acceleration.",
  );
  assert.equal(english.classification, "english-or-numeric");

  const bijoy = analyzeBanglaPdfText(
    "Avwg evsjvq Mvb MvB, cÖkœ DËi mwVK GKwU † © ¨ | Avwg evsjv",
  );
  assert.equal(bijoy.classification, "legacy-bijoy-or-garbled");
  assert.equal(bijoy.suspectLegacyBijoy, true);

  const scanned = analyzeBanglaPdfText("   ");
  assert.equal(scanned.classification, "empty-scanned");
});

test("localizeJoinError maps known RPC codes to Bangla messages", () => {
  assert.match(localizeJoinError("EXAM_NOT_FOUND", "Exam not found"), /Teacher Code/);
  assert.match(localizeJoinError("RATE_LIMITED", "Too many attempts"), /অপেক্ষা|কিছুক্ষণ/);
  assert.equal(localizeJoinError("UNKNOWN", "Custom error"), "Custom error");
});
