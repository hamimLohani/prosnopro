import { NextRequest, NextResponse } from "next/server";
import { extractMcqDraftsFromPdf } from "@/lib/ai/providers";
import { getAuthenticatedTeacherAiCredentials } from "@/lib/ai/teacher-key";
import { createClient } from "@/lib/supabase/server";
import type { Exam } from "@/lib/types";

export async function POST(request: NextRequest) {
  const credResult = await getAuthenticatedTeacherAiCredentials();
  if (!credResult.ok) {
    return NextResponse.json(
      { ok: false, code: credResult.code, message: credResult.message },
      { status: credResult.status },
    );
  }

  let body: {
    examId?: string;
    extractedText?: string;
    imageDataUrls?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "অনুরোধের JSON সঠিক নয়।" }, { status: 400 });
  }

  if (!body.examId) {
    return NextResponse.json({ ok: false, message: "examId দেওয়া আবশ্যক।" }, { status: 400 });
  }

  const imageDataUrls = Array.isArray(body.imageDataUrls) ? body.imageDataUrls.slice(0, 3) : [];
  const extractedText = body.extractedText?.trim() ?? "";

  if (imageDataUrls.length === 0 && !extractedText) {
    return NextResponse.json(
      { ok: false, message: "PDF থেকে Text অথবা পেজ Image দিন।" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase পাওয়া যাচ্ছে না।" }, { status: 503 });
  }

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", body.examId)
    .eq("teacher_id", credResult.credentials.userId)
    .maybeSingle<Exam>();

  if (!exam) {
    return NextResponse.json({ ok: false, message: "Exam পাওয়া যায়নি।" }, { status: 404 });
  }

  try {
    const drafts = await extractMcqDraftsFromPdf({
      provider: credResult.credentials.provider,
      model: credResult.credentials.model,
      apiKey: credResult.credentials.apiKey,
      medium: exam.medium,
      optionsPerQuestion: exam.options_per_question,
      defaultMarks: Number(exam.default_marks),
      extractedText: extractedText.slice(0, 24000),
      imageDataUrls,
    });

    return NextResponse.json({
      ok: true,
      provider: credResult.credentials.provider,
      drafts,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "PDF থেকে প্রশ্ন বের করা যায়নি।",
      },
      { status: 502 },
    );
  }
}
