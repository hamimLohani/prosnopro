import { NextRequest, NextResponse } from "next/server";
import { generateMcqDrafts } from "@/lib/ai/providers";
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
    classLevel?: string;
    subject?: string;
    count?: number;
    notes?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.examId) {
    return NextResponse.json({ ok: false, message: "examId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase unavailable." }, { status: 503 });
  }

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", body.examId)
    .eq("teacher_id", credResult.credentials.userId)
    .maybeSingle<Exam>();

  if (!exam) {
    return NextResponse.json({ ok: false, message: "Exam not found." }, { status: 404 });
  }

  const count = Math.min(100, Math.max(1, Math.floor(Number(body.count) || 5)));

  try {
    const drafts = await generateMcqDrafts({
      provider: credResult.credentials.provider,
      model: credResult.credentials.model,
      apiKey: credResult.credentials.apiKey,
      medium: exam.medium,
      subject: body.subject?.trim() || exam.subject,
      classLevel: body.classLevel?.trim() || "",
      count,
      optionsPerQuestion: exam.options_per_question,
      defaultMarks: Number(exam.default_marks),
      notes: body.notes ?? "",
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
        message: err instanceof Error ? err.message : "Failed to generate questions.",
      },
      { status: 502 },
    );
  }
}
