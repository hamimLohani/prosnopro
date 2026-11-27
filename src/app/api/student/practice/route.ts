import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  }

  const sp = request.nextUrl.searchParams;
  const keyword = sp.get("keyword") ?? "";
  const subject = sp.get("subject") ?? "";
  const classLevel = sp.get("class") ?? "";
  const medium = sp.get("medium") ?? "all";
  const offset = Math.max(0, Number(sp.get("offset")) || 0);

  const { data, error } = await supabase.rpc("search_student_practice_questions", {
    p_keyword: keyword,
    p_subject: subject,
    p_class: classLevel,
    p_medium: medium,
    p_limit: 30,
    p_offset: offset,
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const result = data as {
    ok?: boolean;
    code?: string;
    active_exam_id?: string;
    message?: string;
    items?: unknown[];
  };

  if (!result?.ok) {
    const status =
      result?.code === "UNAUTHORIZED"
        ? 401
        : result?.code === "FORBIDDEN"
          ? 403
          : result?.code === "ATTEMPT_IN_PROGRESS"
            ? 409
            : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
