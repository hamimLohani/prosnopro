import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { TeacherSettingsForm } from "@/components/teacher-settings-form";
import { isValidProvider } from "@/lib/ai/providers";
import { isEncryptionConfigured } from "@/lib/crypto";
import { isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";

export default async function TeacherSettingsPage() {
  const ctx = await getCurrentUserContext();

  if (!ctx.configured) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-3xl px-4 py-10">
          <SetupBanner />
        </main>
      </div>
    );
  }

  if (!ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "teacher") redirect("/student");

  const supabase = await createClient();
  const { data: aiStatusRaw } = supabase
    ? await supabase.rpc("get_teacher_ai_status")
    : { data: null };

  const aiStatus = (aiStatusRaw ?? {}) as {
    ai_provider?: string | null;
    ai_model?: string | null;
    ai_key_hint?: string | null;
    has_key?: boolean;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Settings</h1>
            <p className="text-sm text-slate-600">
              Manage your Teacher Code and personal BYOK AI API key.
            </p>
          </div>
          <Link href="/teacher" className="text-sm font-semibold text-navy hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <TeacherSettingsForm
          initialName={ctx.profile.name}
          initialTeacherCode={ctx.teacherProfile?.teacher_code ?? ""}
          email={ctx.email}
          initialAiProvider={
            isValidProvider(aiStatus.ai_provider) ? aiStatus.ai_provider : null
          }
          initialAiModel={aiStatus.ai_model ?? null}
          initialHasKey={Boolean(aiStatus.has_key)}
          initialKeyHint={aiStatus.ai_key_hint ?? null}
          serverEncryptionReady={isAdminClientConfigured() && isEncryptionConfigured()}
        />
      </main>
    </div>
  );
}
