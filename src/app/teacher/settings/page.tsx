import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { TeacherSettingsForm } from "@/components/teacher-settings-form";
import { isValidProvider } from "@/lib/ai/providers";
import { isEncryptionConfigured } from "@/lib/crypto";
import { isAdminClientConfigured } from "@/lib/supabase/admin";
import { getCurrentUserContext } from "@/lib/supabase/server";

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

  const tp = ctx.teacherProfile;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">Settings</h1>
            <p className="text-sm text-slate-600">
              আপনার Teacher Code এবং নিজস্ব BYOK AI API Key পরিচালনা করুন।
            </p>
          </div>
          <Link href="/teacher" className="py-1 text-sm font-semibold text-navy hover:underline shrink-0">
            ← Dashboard-এ ফিরে যান
          </Link>
        </div>

        <TeacherSettingsForm
          initialName={ctx.profile.name}
          initialTeacherCode={tp?.teacher_code ?? ""}
          email={ctx.email}
          initialAiProvider={isValidProvider(tp?.ai_provider) ? tp.ai_provider : null}
          initialAiModel={tp?.ai_model ?? null}
          initialHasKey={Boolean(tp?.ai_key_hint)}
          initialKeyHint={tp?.ai_key_hint ?? null}
          serverEncryptionReady={isAdminClientConfigured() && isEncryptionConfigured()}
        />
      </main>
    </div>
  );
}
