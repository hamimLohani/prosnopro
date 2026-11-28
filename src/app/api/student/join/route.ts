import { NextRequest, NextResponse } from "next/server";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { getClientIp } from "@/lib/request-ip";
import { createClient } from "@/lib/supabase/server";
import { localizeJoinError, normalizeExamCode, normalizeTeacherCode } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const lang = await getServerLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: t("Supabase কনফিগার করা নেই।", "Supabase is not configured.") },
      { status: 503 },
    );
  }

  let body: { teacherCode?: string; examCode?: string };
  try {
    body = (await request.json()) as { teacherCode?: string; examCode?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: t("অনুরোধের তথ্য সঠিক নয়।", "Invalid request payload.") },
      { status: 400 },
    );
  }

  const teacherCode = normalizeTeacherCode(body.teacherCode ?? "");
  const examCode = normalizeExamCode(body.examCode ?? "");

  if (!teacherCode || !examCode) {
    return NextResponse.json(
      {
        ok: false,
        message: t(
          "Teacher Code এবং Exam Code দুটিই লিখুন।",
          "Please enter both Teacher Code and Exam Code.",
        ),
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("join_exam_by_codes", {
    p_teacher_code: teacherCode,
    p_exam_code: examCode,
    p_ip: getClientIp(request),
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const result = data as { ok: boolean; code?: string; message?: string };
  if (!result?.ok) {
    const status =
      result?.code === "UNAUTHORIZED"
        ? 401
        : result?.code === "FORBIDDEN"
          ? 403
          : result?.code === "RATE_LIMITED"
            ? 429
            : 400;
    return NextResponse.json(
      { ...result, message: localizeJoinError(result?.code, result?.message, lang) },
      { status },
    );
  }

  return NextResponse.json(result);
}
