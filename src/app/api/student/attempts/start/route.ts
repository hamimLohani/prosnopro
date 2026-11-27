import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/request-ip";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "UNCONFIGURED" }, { status: 503 });
  }

  let body: { examId?: string; sessionId?: string };
  try {
    body = (await request.json()) as { examId?: string; sessionId?: string };
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.examId || !body.sessionId) {
    return NextResponse.json({ ok: false, code: "MISSING_FIELDS" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("start_or_resume_attempt", {
    p_exam_id: body.examId,
    p_session_id: body.sessionId,
    p_ip: getClientIp(request),
    p_user_agent: request.headers.get("user-agent") ?? "",
  });

  if (error) {
    return NextResponse.json({ ok: false, code: "RPC_ERROR", message: error.message }, { status: 500 });
  }

  const result = data as { ok: boolean; code?: string };
  if (!result?.ok) {
    const status =
      result?.code === "UNAUTHORIZED"
        ? 401
        : result?.code === "FORBIDDEN"
          ? 403
          : result?.code === "ALREADY_SUBMITTED"
            ? 409
            : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
