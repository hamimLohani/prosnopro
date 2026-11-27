import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";
import type { CurrentUserContext, Profile, TeacherProfile } from "@/lib/types";

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

export async function getCurrentUserContext(): Promise<CurrentUserContext> {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      configured: true,
      userId: null,
      email: null,
      emailVerified: false,
      profile: null,
      teacherProfile: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, name, roll, institution, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  let teacherProfile: TeacherProfile | null = null;
  if (profile?.role === "teacher") {
    const { data: tp } = await supabase
      .from("teacher_profiles")
      .select("user_id, teacher_code, ai_provider, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle<TeacherProfile>();
    teacherProfile = tp ?? null;
  }

  return {
    configured: true,
    userId: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    profile: profile ?? null,
    teacherProfile,
  };
}
