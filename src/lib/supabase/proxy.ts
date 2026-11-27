import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

const AUTH_PAGES = new Set([
  "/login",
  "/signup",
  "/signup/teacher",
  "/signup/student",
  "/verify-email",
  "/reset-password",
]);

function isProtectedPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey, configured } = getSupabaseEnv();

  if (!configured) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Verify JWT claims locally via cached JWKS (avoids a slow Auth HTTP round-trip on every click)
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  const { pathname } = request.nextUrl;
  const isTeacherRoute = isProtectedPrefix(pathname, "/teacher");
  const isStudentRoute = isProtectedPrefix(pathname, "/student");
  const isOnboardingRoute = isProtectedPrefix(pathname, "/onboarding");
  const isAuthPage = AUTH_PAGES.has(pathname);

  if (!userId) {
    if (isTeacherRoute || isStudentRoute || isOnboardingRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // Protected /teacher* and /student* pages enforce role & profile checks inside Server Components
  // via React-cached getCurrentUserContext(), avoiding a duplicate DB query here on every nav click.
  if (isAuthPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle<{ role: "teacher" | "student" }>();

    const destUrl = request.nextUrl.clone();
    destUrl.pathname = profile
      ? profile.role === "teacher"
        ? "/teacher"
        : "/student"
      : "/onboarding";
    destUrl.search = "";
    return NextResponse.redirect(destUrl);
  }

  return response;
}
