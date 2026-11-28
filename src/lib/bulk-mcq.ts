import type { DraftMcqQuestion } from "@/lib/ai/schema";

const OPTION_PREFIX_RE = /^(?:[ক-চ]|[A-Fa-f]|[1-6])[).:\-]\s*(.+)$/;
const ANSWER_LINE_RE = /^(?:ans(?:wer)?|correct|উত্তর)\s*[:\-]\s*(.+)$/i;
const EXPLANATION_LINE_RE = /^(?:explanation|exp|ex|ব্যাখ্যা)\s*[:\-]\s*(.*)$/i;
const QUESTION_NUM_RE = /^(?:q?\d+[).:\-]|প্রশ্ন\s*\d*[).:\-])\s*(.+)$/i;

const LETTER_MAP: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "ক": 0,
  "খ": 1,
  "গ": 2,
  "ঘ": 3,
  "ঙ": 4,
  "চ": 5,
};

function parseAnswerToken(raw: string, optionCount: number): number | null {
  const cleaned = raw.trim().replace(/[().]/g, "").toLowerCase();
  const firstChar = cleaned.charAt(0);
  const idx = LETTER_MAP[cleaned] ?? LETTER_MAP[firstChar];
  if (typeof idx === "number" && idx >= 0 && idx < optionCount) {
    return idx;
  }
  return null;
}

/**
 * Parses plain-text MCQ blocks (from Word, Notepad, or WhatsApp) into draft questions
 * without requiring an AI API key.
 */
export function parseBulkMcqText(
  rawText: string,
  expectedOptionCount: number,
  defaultMarks: number,
): DraftMcqQuestion[] {
  const blocks = rawText
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const drafts: DraftMcqQuestion[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 3) continue;

    let questionText = "";
    const options: string[] = [];
    let correctIndex: number | null = null;
    let explanation: string | null = null;

    for (const line of lines) {
      const ansMatch = line.match(ANSWER_LINE_RE);
      if (ansMatch) {
        const parsed = parseAnswerToken(ansMatch[1], Math.max(expectedOptionCount, options.length));
        if (parsed !== null) {
          correctIndex = parsed;
        }
        continue;
      }

      const expMatch = line.match(EXPLANATION_LINE_RE);
      if (expMatch) {
        explanation = expMatch[1].trim() || null;
        continue;
      }

      const isStarred = line.startsWith("*");
      const normalizedLine = isStarred ? line.slice(1).trim() : line;
      const optMatch = normalizedLine.match(OPTION_PREFIX_RE);

      if (optMatch && questionText) {
        if (isStarred) {
          correctIndex = options.length;
        }
        options.push(optMatch[1].trim());
        continue;
      }

      if (!questionText) {
        const qMatch = normalizedLine.match(QUESTION_NUM_RE);
        questionText = qMatch ? qMatch[1].trim() : normalizedLine;
      } else if (options.length === 0) {
        questionText = `${questionText} ${normalizedLine}`;
      }
    }

    if (!questionText || options.length !== expectedOptionCount) {
      continue;
    }

    drafts.push({
      text: questionText,
      options,
      correct_index: correctIndex !== null && correctIndex < options.length ? correctIndex : 0,
      explanation,
      marks: defaultMarks,
    });
  }

  return drafts;
}
