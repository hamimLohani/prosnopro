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
    return NextResponse.json({ ok: false, message: "অনুরোধের JSON সঠিক নয়।" }, { status: 400 });
  }

  if (!body.examId) {
    return NextResponse.json({ ok: false, message: "examId দেওয়া আবশ্যক।" }, { status: 400 });
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

  const count = Math.min(100, Math.max(1, Math.floor(Number(body.count) || 5)));

  try {
    const drafts = await generateMcqDrafts({
      provider: credResult.credentials.provider,
      model: credResult.credentials.model,
      apiKey: credResult.credentials.apiKey,
      medium: exam.medium,
      subject: body.subject?.trim() || exam.subject,
      classLevel: body.classLevel?.trim() || exam.class,
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
        message: err instanceof Error ? err.message : "প্রশ্ন তৈরি করা যায়নি।",
      },
      { status: 502 },
    );
  }
}
