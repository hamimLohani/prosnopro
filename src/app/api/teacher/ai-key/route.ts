import { NextRequest, NextResponse } from "next/server";
import { isValidProvider, testProviderApiKey } from "@/lib/ai/providers";
import { decryptSecret, encryptSecret, isEncryptionConfigured, maskApiKey } from "@/lib/crypto";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireTeacherUser() {
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false as const, status: 503, message: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, status: 401, message: "Authentication required." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (profile?.role !== "teacher") {
    return { ok: false as const, status: 403, message: "Only teachers can manage AI keys." };
  }

  return { ok: true as const, userId: user.id, supabase };
}

export async function GET() {
  const auth = await requireTeacherUser();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const serverReady = isAdminClientConfigured() && isEncryptionConfigured();

  const { data: statusData } = await auth.supabase.rpc("get_teacher_ai_status");
  const status = (statusData ?? {}) as {
    ai_provider?: string | null;
    ai_model?: string | null;
    ai_key_hint?: string | null;
    has_key?: boolean;
  };

  return NextResponse.json({
    ok: true,
    serverReady,
    aiProvider: status.ai_provider ?? null,
    aiModel: status.ai_model ?? null,
    keyHint: status.ai_key_hint ?? null,
    hasKey: Boolean(status.has_key),
  });
}

export async function POST(request: NextRequest) {
  const lang = await getServerLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const auth = await requireTeacherUser();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  if (!isAdminClientConfigured() || !isEncryptionConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Server BYOK encryption requires SUPABASE_SERVICE_ROLE_KEY and AI_ENCRYPTION_KEY in .env.local / Vercel.",
      },
      { status: 503 },
    );
  }

  let body: {
    provider?: string;
    model?: string;
    apiKey?: string;
    verifyKey?: boolean;
    testSavedOnly?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, message: t("অনুরোধের JSON সঠিক নয়।", "Invalid JSON payload.") },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, message: t("Server admin client পাওয়া যাচ্ছে না।", "Server admin client unavailable.") },
      { status: 503 },
    );
  }

  // Test currently saved encrypted key without returning it to the client
  if (body.testSavedOnly) {
    const { data: tp } = await admin
      .from("teacher_profiles")
      .select("ai_provider, ai_model, ai_key_encrypted")
      .eq("user_id", auth.userId)
      .maybeSingle<{
        ai_provider: string | null;
        ai_model: string | null;
        ai_key_encrypted: string | null;
      }>();

    if (!tp?.ai_key_encrypted || !isValidProvider(tp.ai_provider)) {
      return NextResponse.json(
        { ok: false, message: t("কোনো সংরক্ষিত API Key পাওয়া যায়নি।", "No saved API key found.") },
        { status: 400 },
      );
    }

    const decrypted = decryptSecret(tp.ai_key_encrypted);
    const check = await testProviderApiKey({
      provider: tp.ai_provider,
      model: body.model?.trim() || tp.ai_model,
      apiKey: decrypted,
    });
    return NextResponse.json(check, { status: check.ok ? 200 : 400 });
  }

  if (!isValidProvider(body.provider)) {
    return NextResponse.json(
      { ok: false, message: t("সঠিক AI Provider সিলেক্ট করুন।", "Please select a valid AI provider.") },
      { status: 400 },
    );
  }

  const cleanModel = body.model?.trim() || null;
  const rawKey = body.apiKey?.trim() ?? "";

  if (!rawKey) {
    // Allow updating provider/model while keeping an existing key if already stored
    const { data: existing } = await admin
      .from("teacher_profiles")
      .select("ai_key_encrypted, ai_key_hint")
      .eq("user_id", auth.userId)
      .maybeSingle<{ ai_key_encrypted: string | null; ai_key_hint: string | null }>();

    if (!existing?.ai_key_encrypted) {
      return NextResponse.json(
        { ok: false, message: t("অনুগ্রহ করে আপনার AI API Key পেস্ট করুন।", "Please paste your AI API key.") },
        { status: 400 },
      );
    }

    const { error: updateErr } = await admin
      .from("teacher_profiles")
      .update({
        ai_provider: body.provider,
        ai_model: cleanModel,
      })
      .eq("user_id", auth.userId);

    if (updateErr) {
      return NextResponse.json({ ok: false, message: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      hasKey: true,
      aiProvider: body.provider,
      aiModel: cleanModel,
      keyHint: existing.ai_key_hint,
      message: t("Provider সেটিংস আপডেট হয়েছে।", "Provider settings updated."),
    });
  }

  if (body.verifyKey) {
    const check = await testProviderApiKey({
      provider: body.provider,
      model: cleanModel,
      apiKey: rawKey,
    });
    if (!check.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: t(`Key যাচাই ব্যর্থ হয়েছে: ${check.message}`, `Key verification failed: ${check.message}`),
        },
        { status: 400 },
      );
    }
  }

  const encrypted = encryptSecret(rawKey);
  const keyHint = maskApiKey(rawKey);

  const { error: saveErr } = await admin
    .from("teacher_profiles")
    .update({
      ai_provider: body.provider,
      ai_model: cleanModel,
      ai_key_encrypted: encrypted,
      ai_key_hint: keyHint,
    })
    .eq("user_id", auth.userId);

  if (saveErr) {
    return NextResponse.json({ ok: false, message: saveErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    hasKey: true,
    aiProvider: body.provider,
    aiModel: cleanModel,
    keyHint,
    message: body.verifyKey
      ? t("API Key যাচাই করে নিরাপদভাবে Save করা হয়েছে।", "API key verified and saved securely.")
      : t("API Key নিরাপদভাবে Save করা হয়েছে।", "API key saved securely."),
  });
}

export async function DELETE() {
  const lang = await getServerLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const auth = await requireTeacherUser();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { ok: false, message: t("SUPABASE_SERVICE_ROLE_KEY কনফিগার করা নেই।", "SUPABASE_SERVICE_ROLE_KEY is not configured.") },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, message: t("Server admin client পাওয়া যাচ্ছে না।", "Server admin client unavailable.") },
      { status: 503 },
    );
  }

  const { error } = await admin
    .from("teacher_profiles")
    .update({
      ai_provider: null,
      ai_model: null,
      ai_key_encrypted: null,
      ai_key_hint: null,
    })
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    hasKey: false,
    message: t("সংরক্ষিত API Key মুছে ফেলা হয়েছে।", "Saved API key removed."),
  });
}
