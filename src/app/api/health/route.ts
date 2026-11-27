import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

export async function GET() {
  const { url, anonKey, configured } = getSupabaseEnv();
  const timestamp = new Date().toISOString();

  if (!configured) {
    return NextResponse.json({
      status: "ok",
      database: "unconfigured",
      timestamp,
    });
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Lightweight metadata-only query (zero rows returned) to keep Supabase Free awake.
    const { error } = await supabase
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          database: "error",
          timestamp,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "ok",
      database: "connected",
      timestamp,
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "error",
        timestamp,
      },
      { status: 503 },
    );
  }
}
