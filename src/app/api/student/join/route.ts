import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/request-ip";
import { createClient } from "@/lib/supabase/server";
import { normalizeExamCode, normalizeTeacherCode } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  }

  let body: { teacherCode?: string; examCode?: string };
  try {
    body = (await request.json()) as { teacherCode?: string; examCode?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request payload." }, { status: 400 });
  }

  const teacherCode = normalizeTeacherCode(body.teacherCode ?? "");
  const examCode = normalizeExamCode(body.examCode ?? "");

  if (!teacherCode || !examCode) {
    return NextResponse.json(
      { ok: false, message: "Enter both Teacher Code and Exam Code." },
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
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
