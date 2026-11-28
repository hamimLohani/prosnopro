import { parseAndValidateQuestionsJson, type DraftMcqQuestion } from "@/lib/ai/schema";
import { pickText, type AppLang } from "@/lib/i18n";

export type AiProviderId = "gemini" | "groq" | "openai" | "anthropic";

export interface ProviderMeta {
  id: AiProviderId;
  label: string;
  freeTierNote: string;
  freeTierNoteEn: string;
  defaultTextModel: string;
  defaultVisionModel: string;
  suggestedModels: string[];
  supportsVision: boolean;
  keyConsoleHint: string;
  keyConsoleHintEn: string;
  keyConsoleUrl: string;
  keySetupSteps: string[];
  keySetupStepsEn: string[];
}

export const PROVIDER_CATALOG: Record<AiProviderId, ProviderMeta> = {
  gemini: {
    id: "gemini",
    label: "Google Gemini (AI Studio)",
    freeTierNote: "Credit card ছাড়াই Free tier পাওয়া যায়; বাংলা লেখা ও PDF image সাপোর্ট করে।",
    freeTierNoteEn: "Free tier available with no credit card; supports Bangla text and PDF images.",
    defaultTextModel: "gemini-4-hydrogen",
    defaultVisionModel: "gemini-4-hydrogen",
    suggestedModels: [
      "gemini-4-hydrogen",
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-2.5-flash",
    ],
    supportsVision: true,
    keyConsoleHint: "aistudio.google.com/apikey থেকে Key নিন",
    keyConsoleHintEn: "Get a key at aistudio.google.com/apikey",
    keyConsoleUrl: "https://aistudio.google.com/apikey",
    keySetupSteps: [
      "উপরের লিংক থেকে Google AI Studio খুলুন এবং আপনার Google Account দিয়ে Sign in করুন।",
      "\"Create API key\" বাটনে ট্যাপ করুন, একটি Google Cloud Project সিলেক্ট/তৈরি করে নিশ্চিত করুন।",
      "নতুন Key-এর পাশে \"Copy\" ট্যাপ করুন, এরপর এখানে ফিরে এসে নিচের API Key বক্সে Paste করুন।",
    ],
    keySetupStepsEn: [
      "Open Google AI Studio from the button above and sign in with your Google account.",
      "Click \"Create API key\" and select or create a Google Cloud project.",
      "Click \"Copy\" next to your new key, then paste it into the API Key box below.",
    ],
  },
  groq: {
    id: "groq",
    label: "Groq Cloud",
    freeTierNote: "Credit card ছাড়াই Free tier পাওয়া যায়; অত্যন্ত দ্রুত কাজ করে।",
    freeTierNoteEn: "Free tier available with no credit card; very fast generation.",
    defaultTextModel: "llama-3.3-70b-versatile",
    defaultVisionModel: "qwen/qwen3.8-27b",
    suggestedModels: [
      "llama-3.3-70b-versatile",
      "qwen/qwen3.8-27b",
      "llama-3.1-8b-instant",
    ],
    supportsVision: true,
    keyConsoleHint: "console.groq.com/keys থেকে Key নিন",
    keyConsoleHintEn: "Get a key at console.groq.com/keys",
    keyConsoleUrl: "https://console.groq.com/keys",
    keySetupSteps: [
      "উপরের লিংক থেকে Groq Console খুলুন এবং Google বা GitHub দিয়ে Sign in করুন।",
      "\"Create API Key\" ট্যাপ করে একটি নাম দিন (যেমন: ProsnoPro) এবং Submit করুন।",
      "সাথে সাথে \"Copy\" ট্যাপ করুন (Groq পুরো Key একবারই দেখায়), তারপর নিচে Paste করুন।",
    ],
    keySetupStepsEn: [
      "Open Groq Console from the button above and sign in with Google or GitHub.",
      "Click \"Create API Key\", enter a name (e.g. ProsnoPro), and submit.",
      "Copy the key right away (Groq shows it once), then paste it below.",
    ],
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    freeTierNote: "OpenAI Account-এ সক্রিয় Paid API billing থাকা প্রয়োজন।",
    freeTierNoteEn: "Requires active paid API billing on your OpenAI account.",
    defaultTextModel: "gpt-4.1-mini",
    defaultVisionModel: "gpt-4.1-mini",
    suggestedModels: ["gpt-4.1-mini", "gpt-4o-mini"],
    supportsVision: true,
    keyConsoleHint: "platform.openai.com/api-keys থেকে Key নিন",
    keyConsoleHintEn: "Get a key at platform.openai.com/api-keys",
    keyConsoleUrl: "https://platform.openai.com/api-keys",
    keySetupSteps: [
      "উপরের লিংক থেকে OpenAI API Keys পেজ খুলুন এবং Sign in করুন (Active billing credit থাকতে হবে)।",
      "\"+ Create new secret key\" ট্যাপ করুন, একটি নাম দিন এবং Key তৈরি করুন।",
      "সাথে সাথে \"Copy\" ট্যাপ করুন (পরে আর দেখা যাবে না), এরপর নিচে Paste করুন।",
    ],
    keySetupStepsEn: [
      "Open OpenAI API Keys from the button above and sign in (active billing credit required).",
      "Click \"+ Create new secret key\", give it a name, and create it.",
      "Copy it immediately (it won't be shown again), then paste it below.",
    ],
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    freeTierNote: "Anthropic Account-এ Paid API credit থাকা প্রয়োজন।",
    freeTierNoteEn: "Requires paid API credit on your Anthropic account.",
    defaultTextModel: "claude-sonnet-4-5",
    defaultVisionModel: "claude-sonnet-4-5",
    suggestedModels: ["claude-sonnet-4-5", "claude-3-5-haiku-latest"],
    supportsVision: true,
    keyConsoleHint: "console.anthropic.com থেকে Key নিন",
    keyConsoleHintEn: "Get a key at console.anthropic.com",
    keyConsoleUrl: "https://console.anthropic.com/settings/keys",
    keySetupSteps: [
      "উপরের লিংক থেকে Anthropic Console খুলুন এবং Sign in করুন (Prepaid API credit প্রয়োজন)।",
      "\"Create Key\" ট্যাপ করে একটি নাম দিন (যেমন: ProsnoPro) এবং Confirm করুন।",
      "ডায়ালগ বন্ধ করার আগেই \"Copy Key\" ট্যাপ করুন, তারপর নিচে Paste করুন।",
    ],
    keySetupStepsEn: [
      "Open Anthropic Console from the button above and sign in (prepaid API credit required).",
      "Click \"Create Key\", name it (e.g. ProsnoPro), and confirm.",
      "Click \"Copy Key\" before closing the dialog, then paste it below.",
    ],
  },
};

export function getProviderUiMeta(id: AiProviderId, lang: AppLang) {
  const meta = PROVIDER_CATALOG[id];
  return {
    ...meta,
    freeTierNote: pickText(lang, meta.freeTierNote, meta.freeTierNoteEn),
    keyConsoleHint: pickText(lang, meta.keyConsoleHint, meta.keyConsoleHintEn),
    keySetupSteps: lang === "en" ? meta.keySetupStepsEn : meta.keySetupSteps,
  };
}

export function isValidProvider(raw: unknown): raw is AiProviderId {
  return raw === "gemini" || raw === "groq" || raw === "openai" || raw === "anthropic";
}

class ProviderHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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

async function callSingleModel({
  provider,
  chosenModel,
  apiKey,
  systemPrompt,
  userPrompt,
  imageDataUrls = [],
}: {
  provider: AiProviderId;
  chosenModel: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  imageDataUrls?: string[];
}): Promise<string> {
  const meta = PROVIDER_CATALOG[provider];
  const hasImages = imageDataUrls.length > 0;

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
      throw new ProviderHttpError(json.error?.message ?? `Gemini API error (${res.status}).`, res.status);
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new ProviderHttpError("Gemini returned an empty response.", 502);
    }
    return text;
  }

  if (provider === "groq" || provider === "openai") {
    const endpoint =
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

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
      throw new ProviderHttpError(
        json.error?.message ?? `${meta.label} API error (${res.status}).`,
        res.status,
      );
    }

    const text = json.choices?.[0]?.message?.content;
    if (!text) {
      throw new ProviderHttpError(`${meta.label} returned an empty response.`, 502);
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
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: contentBlocks }],
    }),
  });

  const json = (await res.json()) as {
    error?: { message?: string };
    content?: Array<{ type?: string; text?: string }>;
  };

  if (!res.ok) {
    throw new ProviderHttpError(
      json.error?.message ?? `Anthropic API error (${res.status}).`,
      res.status,
    );
  }

  const text = json.content?.find((b) => b.type === "text")?.text;
  if (!text) {
    throw new ProviderHttpError("Anthropic returned an empty response.", 502);
  }
  return text;
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
  const primary = model?.trim() || (hasImages ? meta.defaultVisionModel : meta.defaultTextModel);

  const candidates =
    provider === "gemini"
      ? Array.from(new Set([primary, ...meta.suggestedModels]))
      : provider === "groq" && !hasImages
        ? Array.from(new Set([primary, "llama-3.3-70b-versatile", "llama-3.1-8b-instant"]))
        : [primary];

  let lastError: unknown;
  for (const candidateModel of candidates) {
    try {
      return await callSingleModel({
        provider,
        chosenModel: candidateModel,
        apiKey,
        systemPrompt,
        userPrompt,
        imageDataUrls,
      });
    } catch (err) {
      lastError = err;
      const status = err instanceof ProviderHttpError ? err.status : 0;
      // Retry on transient overload / rate limit / unavailable model ID; fail immediately on auth/key errors.
      if (status === 429 || status === 503 || status === 404) {
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI request failed.");
}

/**
 * Verifies the API key itself via each provider's lightweight /models endpoint
 * so temporary demand spikes on a specific model or zero-token checks don't reject valid keys.
 */
export async function testProviderApiKey(params: {
  provider: AiProviderId;
  model?: string | null;
  apiKey: string;
}): Promise<{ ok: boolean; message: string }> {
  const key = params.apiKey.trim();
  if (!key) {
    return { ok: false, message: "API key is empty." };
  }

  try {
    if (params.provider === "gemini") {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
        {
          headers: { "x-goog-api-key": key },
        },
      );
      if (res.ok) {
        return { ok: true, message: "Gemini API key verified successfully." };
      }
      const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return {
        ok: false,
        message: errJson.error?.message ?? `Invalid Gemini API key (${res.status}).`,
      };
    }

    if (params.provider === "groq" || params.provider === "openai") {
      const url =
        params.provider === "groq"
          ? "https://api.groq.com/openai/v1/models"
          : "https://api.openai.com/v1/models";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return {
          ok: true,
          message: `${PROVIDER_CATALOG[params.provider].label} key verified successfully.`,
        };
      }
      const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return {
        ok: false,
        message: errJson.error?.message ?? `Key verification failed (${res.status}).`,
      };
    }

    // Anthropic
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
    });
    if (res.ok) {
      return { ok: true, message: "Anthropic API key verified successfully." };
    }
    const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    return {
      ok: false,
      message: errJson.error?.message ?? `Anthropic key verification failed (${res.status}).`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Network error while verifying API key.",
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
  const isUniversity = /university|undergraduate|masters|postgraduate|engineering|medical|mbbs|bba|mba|honours|diploma|semester|cse|eee|llb/i.test(
    `${params.classLevel} ${params.subject}`,
  );
  const curriculumContext = isUniversity
    ? "university / higher-education academic standards"
    : "the Bangladesh NCTB curriculum (when applicable)";

  const systemPrompt = [
    `You are an expert exam question setter aligned with ${curriculumContext}.`,
    "Return ONLY valid JSON matching this exact shape:",
    `{"questions":[{"text":"...","options":["..."],"correct_index":0,"explanation":"...","marks":${params.defaultMarks}}]}`,
    `Every question MUST have exactly ${params.optionsPerQuestion} plausible, distinct options with only 1 unambiguously correct answer—avoid "All of the above" or "None of the above".`,
    `correct_index MUST be an integer from 0 to ${params.optionsPerQuestion - 1}.`,
    "Test conceptual understanding and application, not just rote memorization.",
    "Include a concise 1–2 line explanation for each question.",
    "Use inline KaTeX math ($...$) when writing mathematical equations.",
    "Do not include markdown commentary outside JSON.",
  ].join(" ");

  const userPrompt = [
    `Generate ${params.count} moderate-difficulty, original multiple-choice questions.`,
    `Language / Medium: ${languageLabel}.`,
    `Subject: ${params.subject || "General"}.`,
    `Class / Level: ${params.classLevel || "Secondary / Higher Secondary"}.`,
    "Balance the questions evenly across any chapters or topics specified below.",
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
