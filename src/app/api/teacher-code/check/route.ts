import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidTeacherCode, normalizeTeacherCode } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const rawCode = request.nextUrl.searchParams.get("code") ?? "";
  const normalized = normalizeTeacherCode(rawCode);

  if (!isValidTeacherCode(normalized)) {
    return NextResponse.json({
      valid: false,
      available: false,
      normalized,
      reason: "Use 4–12 English letters or digits (A–Z, 0–9).",
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      {
        valid: true,
        available: null,
        normalized,
        reason: "Supabase is not configured yet.",
      },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.rpc("check_teacher_code_available", {
    p_code: normalized,
  });

  if (error) {
    return NextResponse.json(
      {
        valid: true,
        available: null,
        normalized,
        reason: "Could not verify availability right now.",
      },
      { status: 500 },
    );
  }

  const available = Boolean(data);
  return NextResponse.json({
    valid: true,
    available,
    normalized,
    reason: available ? "Available" : "This Teacher Code is already taken.",
  });
}
