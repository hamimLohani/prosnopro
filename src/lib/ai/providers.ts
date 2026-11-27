import { parseAndValidateQuestionsJson, type DraftMcqQuestion } from "@/lib/ai/schema";

export type AiProviderId = "gemini" | "groq" | "openai" | "anthropic";

export interface ProviderMeta {
  id: AiProviderId;
  label: string;
  freeTierNote: string;
  defaultTextModel: string;
  defaultVisionModel: string;
  suggestedModels: string[];
  supportsVision: boolean;
  keyConsoleHint: string;
}

export const PROVIDER_CATALOG: Record<AiProviderId, ProviderMeta> = {
  gemini: {
    id: "gemini",
    label: "Google Gemini (AI Studio)",
    freeTierNote: "Free tier available without a credit card; supports Bangla text & PDF images.",
    defaultTextModel: "gemini-3.8-flash",
    defaultVisionModel: "gemini-3.8-flash",
    suggestedModels: [
      "gemini-3.8-flash",
      "gemini-4-hydrogen",
      "gemini-3.5-flash-lite",
      "gemini-2.5-flash",
    ],
    supportsVision: true,
    keyConsoleHint: "Get a key at aistudio.google.com/apikey",
  },
  groq: {
    id: "groq",
    label: "Groq Cloud",
    freeTierNote: "Free tier available without a credit card; ultra-fast inference.",
    defaultTextModel: "llama-3.3-70b-versatile",
    defaultVisionModel: "qwen/qwen3.8-27b",
    suggestedModels: [
      "llama-3.3-70b-versatile",
      "qwen/qwen3.8-27b",
      "llama-3.1-8b-instant",
    ],
    supportsVision: true,
    keyConsoleHint: "Get a key at console.groq.com/keys",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    freeTierNote: "Paid API billing required on your OpenAI account.",
    defaultTextModel: "gpt-4.1-mini",
    defaultVisionModel: "gpt-4.1-mini",
    suggestedModels: ["gpt-4.1-mini", "gpt-4o-mini"],
    supportsVision: true,
    keyConsoleHint: "Get a key at platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    freeTierNote: "Paid API billing required on your Anthropic account.",
    defaultTextModel: "claude-sonnet-4-5",
    defaultVisionModel: "claude-sonnet-4-5",
    suggestedModels: ["claude-sonnet-4-5", "claude-3-5-haiku-latest"],
    supportsVision: true,
    keyConsoleHint: "Get a key at console.anthropic.com",
  },
};

export function isValidProvider(raw: unknown): raw is AiProviderId {
  return raw === "gemini" || raw === "groq" || raw === "openai" || raw === "anthropic";
}

interface ProviderCallParams {
  provider: AiProviderId;
  model?: string | null;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  imageDataUrls?: string[];
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL format.");
  }
  return { mimeType: match[1], base64: match[2] };
}

async function callProviderRaw({
  provider,
  model,
  apiKey,
  systemPrompt,
  userPrompt,
  imageDataUrls = [],
}: ProviderCallParams): Promise<string> {
  const meta = PROVIDER_CATALOG[provider];
  const hasImages = imageDataUrls.length > 0;
  const chosenModel =
    model?.trim() || (hasImages ? meta.defaultVisionModel : meta.defaultTextModel);

  if (provider === "gemini") {
    const parts: Array<Record<string, unknown>> = [{ text: `${systemPrompt}\n\n${userPrompt}` }];
    for (const url of imageDataUrls) {
      const { mimeType, base64 } = parseDataUrl(url);
      parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(chosenModel)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
      },
    );

    const json = (await res.json()) as {
      error?: { message?: string };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    if (!res.ok) {
      throw new Error(json.error?.message ?? `Gemini API error (${res.status}).`);
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }
    return text;
  }

  if (provider === "groq" || provider === "openai") {
    const endpoint =
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

    // On Groq, if the teacher picked a text-only model (like llama-3.3-70b-versatile)
    // but sent PDF images, automatically use Groq's vision model for this image batch.
    const effectiveModel =
      provider === "groq" && hasImages && chosenModel.includes("llama-3.3-70b")
        ? meta.defaultVisionModel
        : chosenModel;

    const userContent: unknown = hasImages
      ? [
          { type: "text", text: userPrompt },
          ...imageDataUrls.map((url) => ({
            type: "image_url",
            image_url: { url },
          })),
        ]
      : userPrompt;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: effectiveModel,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    const json = (await res.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!res.ok) {
      throw new Error(json.error?.message ?? `${meta.label} API error (${res.status}).`);
    }

    const text = json.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error(`${meta.label} returned an empty response.`);
    }
    return text;
  }

  // Anthropic
  const contentBlocks: Array<Record<string, unknown>> = [];
  for (const url of imageDataUrls) {
    const { mimeType, base64 } = parseDataUrl(url);
    contentBlocks.push({
      type: "image",
      source: { type: "base64", media_type: mimeType, data: base64 },
    });
  }
  contentBlocks.push({ type: "text", text: userPrompt });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: chosenModel,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: contentBlocks }],
    }),
  });

  const json = (await res.json()) as {
    error?: { message?: string };
    content?: Array<{ type?: string; text?: string }>;
  };

  if (!res.ok) {
    throw new Error(json.error?.message ?? `Anthropic API error (${res.status}).`);
  }

  const text = json.content?.find((b) => b.type === "text")?.text;
  if (!text) {
    throw new Error("Anthropic returned an empty response.");
  }
  return text;
}

export async function testProviderApiKey(params: {
  provider: AiProviderId;
  model?: string | null;
  apiKey: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const raw = await callProviderRaw({
      provider: params.provider,
      model: params.model,
      apiKey: params.apiKey,
      systemPrompt: 'Respond strictly with JSON: {"ok": true}',
      userPrompt: 'Return {"ok": true}',
    });
    if (!raw) {
      return { ok: false, message: "Empty response from provider." };
    }
    return { ok: true, message: "API key verified successfully." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Failed to verify API key.",
    };
  }
}

export async function generateMcqDrafts(params: {
  provider: AiProviderId;
  model?: string | null;
  apiKey: string;
  medium: "bn" | "en";
  subject: string;
  classLevel: string;
  count: number;
  optionsPerQuestion: number;
  defaultMarks: number;
  notes: string;
}): Promise<DraftMcqQuestion[]> {
  const languageLabel = params.medium === "bn" ? "Bangla (UTF-8 Bengali script)" : "English";
  const systemPrompt = [
    "You are an expert exam question setter.",
    "Return ONLY valid JSON matching this exact shape:",
    `{"questions":[{"text":"...","options":["..."],"correct_index":0,"explanation":"...","marks":${params.defaultMarks}}]}`,
    `Every question MUST have exactly ${params.optionsPerQuestion} options.`,
    `correct_index MUST be an integer from 0 to ${params.optionsPerQuestion - 1}.`,
    "Use inline KaTeX math ($...$) when writing mathematical equations.",
    "Do not include markdown commentary outside JSON.",
  ].join(" ");

  const userPrompt = [
    `Generate ${params.count} original multiple-choice questions.`,
    `Language / Medium: ${languageLabel}.`,
    `Subject: ${params.subject || "General"}.`,
    `Class / Level: ${params.classLevel || "Secondary / Higher Secondary"}.`,
    params.notes.trim() ? `Teacher notes / syllabus focus:\n${params.notes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callProviderRaw({
    provider: params.provider,
    model: params.model,
    apiKey: params.apiKey,
    systemPrompt,
    userPrompt,
  });

  return parseAndValidateQuestionsJson(raw, params.optionsPerQuestion, params.defaultMarks);
}

export async function extractMcqDraftsFromPdf(params: {
  provider: AiProviderId;
  model?: string | null;
  apiKey: string;
  medium: "bn" | "en";
  optionsPerQuestion: number;
  defaultMarks: number;
  extractedText?: string;
  imageDataUrls?: string[];
}): Promise<DraftMcqQuestion[]> {
  const languageLabel = params.medium === "bn" ? "Bangla (UTF-8 Bengali script)" : "English";
  const systemPrompt = [
    "You extract multiple-choice questions from exam papers accurately.",
    "Return ONLY valid JSON matching this exact shape:",
    `{"questions":[{"text":"...","options":["..."],"correct_index":0,"explanation":"...","marks":${params.defaultMarks}}]}`,
    `Each extracted MCQ MUST have exactly ${params.optionsPerQuestion} options.`,
    `If an answer key is not visible in the source, set correct_index to 0 and note 'Confirm answer' in explanation so the teacher reviews it.`,
    "Preserve Bangla Unicode cleanly and wrap math formulas in $...$.",
  ].join(" ");

  const userPrompt = params.imageDataUrls?.length
    ? `Extract all ${languageLabel} multiple-choice questions visible on these exam page image(s).`
    : `Extract all ${languageLabel} multiple-choice questions from the following PDF text:\n\n${params.extractedText ?? ""}`;

  const raw = await callProviderRaw({
    provider: params.provider,
    model: params.model,
    apiKey: params.apiKey,
    systemPrompt,
    userPrompt,
    imageDataUrls: params.imageDataUrls,
  });

  return parseAndValidateQuestionsJson(raw, params.optionsPerQuestion, params.defaultMarks);
}
