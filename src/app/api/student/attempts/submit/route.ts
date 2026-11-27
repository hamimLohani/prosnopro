import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ViolationCounts } from "@/lib/types";

interface SubmitPayload {
  attemptId?: string;
  sessionId?: string;
  answers?: Record<string, number>;
  violationCounts?: ViolationCounts;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "UNCONFIGURED" }, { status: 503 });
  }

  let body: SubmitPayload;
  try {
    body = (await request.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.attemptId || !body.sessionId) {
    return NextResponse.json({ ok: false, code: "MISSING_FIELDS" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("submit_exam_attempt", {
    p_attempt_id: body.attemptId,
    p_session_id: body.sessionId,
    p_answers: body.answers ?? {},
    p_violation_counts: body.violationCounts ?? null,
  });

  if (error) {
    return NextResponse.json({ ok: false, code: "RPC_ERROR", message: error.message }, { status: 500 });
  }

  const result = data as { ok: boolean; code?: string };
  if (!result?.ok) {
    const status =
      result?.code === "SESSION_TAKEN_OVER"
        ? 409
        : result?.code === "UNAUTHORIZED"
          ? 401
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
