export const TEACHER_CODE_REGEX = /^[A-Za-z0-9]{4,12}$/;
export const EXAM_CODE_REGEX = /^[A-Za-z0-9]{3,16}$/;

export function normalizeTeacherCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidTeacherCode(raw: string): boolean {
  return TEACHER_CODE_REGEX.test(normalizeTeacherCode(raw));
}

export function normalizeExamCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidExamCode(raw: string): boolean {
  return EXAM_CODE_REGEX.test(normalizeExamCode(raw));
}

export function generateExamCode(length = 6): string {
  // Omit visually ambiguous 0, O, 1, I, L
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

export interface BanglaPdfAnalysis {
  charCount: number;
  bengaliChars: number;
  bengaliRatio: number;
  suspectLegacyBijoy: boolean;
  classification: "unicode-bangla" | "english-or-numeric" | "legacy-bijoy-or-garbled" | "empty-scanned";
  recommendation: string;
}

/**
 * Distinguishes clean Unicode Bangla/English PDFs from scanned pages or legacy
 * ANSI/Bijoy-encoded PDFs (e.g., SutonnyMJ), which extract garbled ASCII glyphs.
 */
export function analyzeBanglaPdfText(rawText: string): BanglaPdfAnalysis {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (text.length < 15) {
    return {
      charCount: text.length,
      bengaliChars: 0,
      bengaliRatio: 0,
      suspectLegacyBijoy: false,
      classification: "empty-scanned",
      recommendation:
        "No embedded text found (likely a scanned PDF). Render page images in browser and send to Vision OCR.",
    };
  }

  const nonSpaceChars = text.replace(/\s/g, "");
  const bengaliMatches = nonSpaceChars.match(/[\u0980-\u09FF]/g) ?? [];
  const bengaliChars = bengaliMatches.length;
  const bengaliRatio = nonSpaceChars.length > 0 ? bengaliChars / nonSpaceChars.length : 0;

  const symbolMatches =
    nonSpaceChars.match(/[©¨‡†ˆ‰Š‹ŒŽ''""•–—˜™š›œžŸ¡¢£¤¥¦§ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿|]/g) ?? [];
  const hasHighSymbols = symbolMatches.length / nonSpaceChars.length > 0.03;
  const hasBijoyPatterns = /\b(Avwg|evsjv|cÖkœ|DËi|mwVK|Kivi|GKwU)\b/.test(text);

  if (bengaliRatio >= 0.15) {
    return {
      charCount: nonSpaceChars.length,
      bengaliChars,
      bengaliRatio,
      suspectLegacyBijoy: false,
      classification: "unicode-bangla",
      recommendation:
        "Valid Bengali Unicode detected. Safe to parse text directly with zero image/vision tokens.",
    };
  }

  if (hasHighSymbols || hasBijoyPatterns) {
    return {
      charCount: nonSpaceChars.length,
      bengaliChars,
      bengaliRatio,
      suspectLegacyBijoy: true,
      classification: "legacy-bijoy-or-garbled",
      recommendation:
        "Legacy ANSI/Bijoy encoding suspected (text extracted as garbled ASCII). Route rendered page images to Vision OCR.",
    };
  }

  return {
    charCount: nonSpaceChars.length,
    bengaliChars,
    bengaliRatio,
    suspectLegacyBijoy: false,
    classification: "english-or-numeric",
    recommendation:
      "Clean English/ASCII text detected. Safe to send extracted text directly to your AI provider.",
  };
}

const JOIN_ERROR_MAP: Record<string, string> = {
  UNAUTHORIZED: "Exam-এ জয়েন করতে আগে Sign in করুন।",
  FORBIDDEN: "শুধুমাত্র Student অ্যাকাউন্ট থেকে Exam-এ জয়েন করা যাবে।",
  RATE_LIMITED: "অনেকবার ভুল Code দেওয়া হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
  EXAM_NOT_FOUND: "Teacher Code বা Exam Code সঠিক নয়। আবার যাচাই করুন।",
  EXAM_CLOSED: "এই Exam-টি ইতিমধ্যে বন্ধ (Closed) করা হয়েছে।",
  NOT_OPEN_YET: "এই Exam-টি এখনো শুরু হয়নি।",
  PAST_CLOSE_TIME: "এই Exam-এর নির্ধারিত সময় শেষ হয়ে গেছে।",
};

export function localizeJoinError(code?: string, fallbackMessage?: string): string {
  if (code && JOIN_ERROR_MAP[code]) {
    return JOIN_ERROR_MAP[code];
  }
  return fallbackMessage || "Exam-এ জয়েন করা যায়নি। Code যাচাই করে আবার চেষ্টা করুন।";
}
