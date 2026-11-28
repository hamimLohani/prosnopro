import { NextRequest, NextResponse } from "next/server";
import { generateMcqDrafts } from "@/lib/ai/providers";
import { getAuthenticatedTeacherAiCredentials } from "@/lib/ai/teacher-key";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import type { Exam, ExamMedium } from "@/lib/types";

export async function POST(request: NextRequest) {
  const lang = await getServerLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const credResult = await getAuthenticatedTeacherAiCredentials();
  if (!credResult.ok) {
    return NextResponse.json(
      { ok: false, code: credResult.code, message: credResult.message },
      { status: credResult.status },
    );
  }

  let body: {
    examId?: string;
    medium?: ExamMedium;
    classLevel?: string;
    subject?: string;
    count?: number;
    notes?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, message: t("অনুরোধের JSON সঠিক নয়।", "Invalid JSON payload.") },
      { status: 400 },
    );
  }

  let targetMedium: ExamMedium = body.medium === "en" ? "en" : "bn";
  let targetSubject = body.subject?.trim() || "General";
  let targetClass = body.classLevel?.trim() || "";
  let optionsPerQuestion = 4;
  let defaultMarks = 1;

  if (body.examId) {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, message: t("Supabase পাওয়া যাচ্ছে না।", "Supabase is unavailable.") },
        { status: 503 },
      );
    }

    const { data: exam } = await supabase
      .from("exams")
      .select("*")
      .eq("id", body.examId)
      .eq("teacher_id", credResult.credentials.userId)
      .maybeSingle<Exam>();

    if (!exam) {
      return NextResponse.json(
        { ok: false, message: t("Exam পাওয়া যায়নি।", "Exam not found.") },
        { status: 404 },
      );
    }

    targetMedium = exam.medium;
    targetSubject = body.subject?.trim() || exam.subject;
    targetClass = body.classLevel?.trim() || exam.class;
    optionsPerQuestion = exam.options_per_question;
    defaultMarks = Number(exam.default_marks);
  }

  const count = Math.min(100, Math.max(1, Math.floor(Number(body.count) || 5)));

  try {
    const drafts = await generateMcqDrafts({
      provider: credResult.credentials.provider,
      model: credResult.credentials.model,
      apiKey: credResult.credentials.apiKey,
      medium: targetMedium,
      subject: targetSubject,
      classLevel: targetClass,
      count,
      optionsPerQuestion,
      defaultMarks,
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
        message:
          err instanceof Error
            ? err.message
            : t("প্রশ্ন তৈরি করা যায়নি।", "Failed to generate questions."),
      },
      { status: 502 },
    );
  }
}
