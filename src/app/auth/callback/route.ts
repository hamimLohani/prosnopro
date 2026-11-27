import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeInternalPath(candidate: string | null): string | null {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return null;
  }
  return candidate;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const roleHint = requestUrl.searchParams.get("role");
  const nextPath = sanitizeInternalPath(requestUrl.searchParams.get("next"));

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=unconfigured", requestUrl.origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin),
      );
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "teacher" | "student" }>();

  if (!profile) {
    const onboardingUrl = new URL("/onboarding", requestUrl.origin);
    if (roleHint === "teacher" || roleHint === "student") {
      onboardingUrl.searchParams.set("role", roleHint);
    }
    return NextResponse.redirect(onboardingUrl);
  }

  if (nextPath && !nextPath.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  }

  const homePath = profile.role === "teacher" ? "/teacher" : "/student";
  return NextResponse.redirect(new URL(homePath, requestUrl.origin));
}
