import { isValidProvider, type AiProviderId } from "@/lib/ai/providers";
import { decryptSecret, isEncryptionConfigured } from "@/lib/crypto";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface TeacherAiCredentials {
  userId: string;
  provider: AiProviderId;
  model: string | null;
  apiKey: string;
}

export async function getAuthenticatedTeacherAiCredentials(): Promise<
  | { ok: true; credentials: TeacherAiCredentials }
  | { ok: false; status: number; message: string; code?: string }
> {
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, status: 503, message: "Supabase is not configured.", code: "UNCONFIGURED" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, message: "Please sign in first.", code: "UNAUTHORIZED" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (profile?.role !== "teacher") {
    return { ok: false, status: 403, message: "Only teachers can use AI tools.", code: "FORBIDDEN" };
  }

  if (!isAdminClientConfigured() || !isEncryptionConfigured()) {
    return {
      ok: false,
      status: 503,
      code: "SERVER_CRYPTO_UNCONFIGURED",
      message:
        "Server BYOK storage requires SUPABASE_SERVICE_ROLE_KEY and AI_ENCRYPTION_KEY in environment variables.",
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, status: 503, message: "Admin client unavailable.", code: "UNCONFIGURED" };
  }

  const { data: tp, error } = await admin
    .from("teacher_profiles")
    .select("ai_provider, ai_model, ai_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle<{
      ai_provider: string | null;
      ai_model: string | null;
      ai_key_encrypted: string | null;
    }>();

  if (error) {
    return { ok: false, status: 500, message: error.message };
  }

  if (!tp?.ai_key_encrypted || !isValidProvider(tp.ai_provider)) {
    return {
      ok: false,
      status: 400,
      code: "NO_TEACHER_API_KEY",
      message: "Please add your own AI API key in Teacher Settings first.",
    };
  }

  try {
    const apiKey = decryptSecret(tp.ai_key_encrypted);
    return {
      ok: true,
      credentials: {
        userId: user.id,
        provider: tp.ai_provider,
        model: tp.ai_model,
        apiKey,
      },
    };
  } catch {
    return {
      ok: false,
      status: 500,
      code: "DECRYPT_FAILED",
      message: "Saved API key could not be decrypted. Please re-enter it in Teacher Settings.",
    };
  }
}
