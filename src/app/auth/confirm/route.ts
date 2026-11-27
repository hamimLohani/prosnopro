import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeInternalPath(candidate: string | null): string | null {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return null;
  }
  return candidate;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = sanitizeInternalPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=unconfigured", request.url));
  }

  // Handle default Supabase PKCE email links (?code=...)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
      );
    }
    if (nextPath) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  } else if (tokenHash && type) {
    // Handle custom token_hash email templates (?token_hash=...&type=...)
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
      );
    }

    if (type === "recovery") {
      return NextResponse.redirect(new URL("/update-password", request.url));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "teacher" | "student" }>();

  if (!profile) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.redirect(
    new URL(profile.role === "teacher" ? "/teacher" : "/student", request.url),
  );
}
