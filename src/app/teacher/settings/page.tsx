import { Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { SignOutButton } from "@/components/sign-out-button";
import { TeacherSettingsForm } from "@/components/teacher-settings-form";
import { isValidProvider } from "@/lib/ai/providers";
import { isEncryptionConfigured } from "@/lib/crypto";
import { isAdminClientConfigured } from "@/lib/supabase/admin";
import { getCurrentUserContext } from "@/lib/supabase/server";

interface TeacherSettingsPageProps {
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function TeacherSettingsPage({ searchParams }: TeacherSettingsPageProps) {
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

  const sp = await searchParams;
  const rawReturn = sp.returnTo ?? "";
  const safeReturnTo = rawReturn.startsWith("/teacher/") ? rawReturn : null;
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
          <Link
            href={safeReturnTo ?? "/teacher"}
            className="py-1 text-sm font-semibold text-navy hover:underline shrink-0"
          >
            {safeReturnTo ? "← Exam-এ ফিরে যান" : "← Dashboard-এ ফিরে যান"}
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
          returnTo={safeReturnTo}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-navy">About ও Privacy Notice</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              ProsnoPro (প্রশ্নপ্রো) — বাংলাদেশি শিক্ষক ও শিক্ষার্থীদের জন্য মোবাইল-বান্ধব বাংলা ও English
              অনলাইন MCQ Exam প্ল্যাটফর্ম। আপনার BYOK AI Key AES-256-GCM এনক্রিপশনে সুরক্ষিত থাকে।
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
            <Link
              href="/about"
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Info className="h-4 w-4 shrink-0 text-navy" />
              <span>About ProsnoPro</span>
            </Link>
            <Link
              href="/privacy"
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>Privacy Notice</span>
            </Link>
            <div className="col-span-2 sm:hidden">
              <SignOutButton className="w-full min-h-[42px] rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
