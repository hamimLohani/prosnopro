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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isTeacherRoute = isProtectedPrefix(pathname, "/teacher");
  const isStudentRoute = isProtectedPrefix(pathname, "/student");
  const isOnboardingRoute = isProtectedPrefix(pathname, "/onboarding");
  const isAuthPage = AUTH_PAGES.has(pathname);

  if (!user) {
    if (isTeacherRoute || isStudentRoute || isOnboardingRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "teacher" | "student" }>();

  if (!profile) {
    if (isTeacherRoute || isStudentRoute || isAuthPage) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/onboarding";
      return NextResponse.redirect(onboardingUrl);
    }
    return response;
  }

  const homePath = profile.role === "teacher" ? "/teacher" : "/student";

  if (isOnboardingRoute || isAuthPage) {
    const destUrl = request.nextUrl.clone();
    destUrl.pathname = homePath;
    destUrl.search = "";
    return NextResponse.redirect(destUrl);
  }

  if (isTeacherRoute && profile.role !== "teacher") {
    const destUrl = request.nextUrl.clone();
    destUrl.pathname = "/student";
    return NextResponse.redirect(destUrl);
  }

  if (isStudentRoute && profile.role !== "student") {
    const destUrl = request.nextUrl.clone();
    destUrl.pathname = "/teacher";
    return NextResponse.redirect(destUrl);
  }

  return response;
}
