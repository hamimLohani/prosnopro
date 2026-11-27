export interface DraftMcqQuestion {
  text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  marks: number;
}

function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    const firstBracket = candidate.indexOf("[");
    const lastBracket = candidate.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(candidate.slice(firstBracket, lastBracket + 1));
    }
    throw new Error("AI response did not contain valid JSON.");
  }
}

export function parseAndValidateQuestionsJson(
  rawText: string,
  expectedOptionsCount: number,
  defaultMarks: number,
): DraftMcqQuestion[] {
  const parsed = extractJsonPayload(rawText);

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null;

  if (!list) {
    throw new Error("AI output JSON must be an array or an object with a 'questions' array.");
  }

  const valid: DraftMcqQuestion[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;

    const text = typeof obj.text === "string" ? obj.text.trim() : typeof obj.question === "string" ? obj.question.trim() : "";
    if (!text) continue;

    if (!Array.isArray(obj.options)) continue;
    const cleanOptions = obj.options
      .map((o) => (typeof o === "string" ? o.trim() : String(o ?? "").trim()))
      .filter(Boolean);

    if (cleanOptions.length !== expectedOptionsCount) continue;

    const rawCorrect = Number(obj.correct_index ?? obj.correctIndex ?? obj.answer_index);
    if (!Number.isInteger(rawCorrect) || rawCorrect < 0 || rawCorrect >= expectedOptionsCount) {
      continue;
    }

    const rawMarks = Number(obj.marks);
    const marks = Number.isFinite(rawMarks) && rawMarks > 0 ? rawMarks : defaultMarks;

    const explanation =
      typeof obj.explanation === "string" && obj.explanation.trim()
        ? obj.explanation.trim()
        : null;

    valid.push({
      text,
      options: cleanOptions,
      correct_index: rawCorrect,
      explanation,
      marks,
    });
  }

  if (valid.length === 0) {
    throw new Error(
      `No valid ${expectedOptionsCount}-option MCQ drafts could be parsed from the AI output.`,
    );
  }

  return valid;
}
