import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseEnv } from "@/lib/env";
import type { CurrentUserContext, Profile, TeacherProfile } from "@/lib/types";

type ProfileWithTeacher = Profile & {
  teacher_profiles?: TeacherProfile | TeacherProfile[] | null;
};

export async function createClient() {
  const { url, anonKey, configured } = getSupabaseEnv();
  if (!configured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignore writes when invoked from a Server Component render.
        }
      },
    },
  });
}

export const getCurrentUserContext = cache(async (): Promise<CurrentUserContext> => {
  // Always read request cookies so auth-aware pages stay dynamic even before env vars are set.
  await cookies();
  const { configured } = getSupabaseEnv();
  if (!configured) {
    return {
      configured: false,
      userId: null,
      email: null,
      emailVerified: false,
      profile: null,
      teacherProfile: null,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      configured: false,
      userId: null,
      email: null,
      emailVerified: false,
      profile: null,
      teacherProfile: null,
    };
  }

  // Fast local JWKS verification (avoids an extra Auth API round-trip per navigation)
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub ?? null;

  if (!userId) {
    return {
      configured: true,
      userId: null,
      email: null,
      emailVerified: false,
      profile: null,
      teacherProfile: null,
    };
  }

  // Single joined query for profile + teacher_profiles (never selects ai_key_encrypted)
  const { data: profileRow } = await supabase
    .from("profiles")
    .select(
      "id, role, name, roll, institution, created_at, updated_at, teacher_profiles(user_id, teacher_code, ai_provider, ai_model, ai_key_hint, created_at, updated_at)",
    )
    .eq("id", userId)
    .maybeSingle<ProfileWithTeacher>();

  let profile: Profile | null = null;
  let teacherProfile: TeacherProfile | null = null;

  if (profileRow) {
    const { teacher_profiles: tpRaw, ...rest } = profileRow;
    profile = rest;
    if (profile.role === "teacher") {
      teacherProfile = Array.isArray(tpRaw) ? (tpRaw[0] ?? null) : (tpRaw ?? null);
    }
  }

  const email = typeof claims?.email === "string" ? claims.email : null;
  const emailVerified = Boolean(
    claims &&
      typeof claims === "object" &&
      "email_verified" in claims &&
      (claims as Record<string, unknown>).email_verified,
  );

  return {
    configured: true,
    userId,
    email,
    emailVerified,
    profile,
    teacherProfile,
  };
});
