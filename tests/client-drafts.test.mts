import assert from "node:assert/strict";
import test from "node:test";
import { generateAiDraftBatches, importPdfDraftsFromFile } from "../src/lib/ai/client-drafts.ts";
import type { DraftMcqQuestion } from "../src/lib/ai/schema.ts";

function makeDraft(idx: number): DraftMcqQuestion {
  return {
    text: `Question ${idx}?`,
    options: ["A", "B", "C", "D"],
    correct_index: 0,
    explanation: null,
    marks: 1,
  };
}

test("generateAiDraftBatches splits >20 requests into 20-item batches and forwards avoid stems", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ count: number; examId?: string; medium?: string; notes: string }> = [];

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body ?? "{}")) as {
      count: number;
      examId?: string;
      medium?: string;
      notes: string;
    };
    calls.push(payload);
    const drafts = Array.from({ length: payload.count }, (_, i) =>
      makeDraft(calls.length * 100 + i),
    );
    return new Response(JSON.stringify({ ok: true, drafts }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const collected: DraftMcqQuestion[] = [];
    const res = await generateAiDraftBatches({
      medium: "en",
      classLevel: "HSC",
      subject: "Physics",
      requestedCount: 25,
      notes: "Focus on vectors",
      aiProvider: "gemini",
      lang: "en",
      onProgress: () => {},
      onBatchDrafts: (batch) => collected.push(...batch),
    });

    assert.equal(res.ok, true);
    assert.equal(collected.length, 25);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].count, 20);
    assert.equal(calls[0].examId, undefined);
    assert.equal(calls[0].medium, "en");
    assert.equal(calls[1].count, 5);
    assert.match(calls[1].notes, /Do NOT repeat these already-generated questions/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("generateAiDraftBatches reports partial progress if a later batch fails", async () => {
  const originalFetch = globalThis.fetch;
  let callNum = 0;

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    callNum += 1;
    const payload = JSON.parse(String(init?.body ?? "{}")) as { count: number };
    if (callNum === 1) {
      const drafts = Array.from({ length: payload.count }, (_, i) => makeDraft(i));
      return new Response(JSON.stringify({ ok: true, drafts }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: false, message: "Rate limit exceeded" }), {
      status: 429,
    });
  }) as typeof fetch;

  try {
    const res = await generateAiDraftBatches({
      medium: "en",
      classLevel: "",
      subject: "Math",
      requestedCount: 25,
      notes: "",
      aiProvider: "openai",
      lang: "en",
      onProgress: () => {},
      onBatchDrafts: () => {},
    });

    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.match(res.error, /Stopped after generating 20 drafts: Rate limit exceeded/);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("importPdfDraftsFromFile rejects files larger than 10 MB before loading pdfjs", async () => {
  const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.pdf", {
    type: "application/pdf",
  });
  const res = await importPdfDraftsFromFile({
    file: oversized,
    medium: "en",
    lang: "en",
    onProgress: () => {},
  });

  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.match(res.error, /10 MB/);
  }
});
