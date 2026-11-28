import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { StudentSettingsForm } from "@/components/student-settings-form";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { getCurrentUserContext } from "@/lib/supabase/server";

export default async function StudentSettingsPage() {
  const [ctx, lang] = await Promise.all([getCurrentUserContext(), getServerLang()]);
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  if (!ctx.configured) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl px-4 py-10">
          <SetupBanner />
        </main>
      </div>
    );
  }

  if (!ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "student") redirect("/teacher/settings");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">
              {t("Student প্রোফাইল সেটিংস", "Student Profile Settings")}
            </h1>
            <p className="text-sm text-slate-600">
              {t(
                "আপনার নাম, Roll/ID ও শিক্ষাপ্রতিষ্ঠানের তথ্য আপডেট করুন।",
                "Update your name, Roll/ID, and institution details.",
              )}
            </p>
          </div>
          <Link href="/student" className="py-1 text-sm font-semibold text-navy hover:underline shrink-0">
            {t("← Student Home-এ ফিরে যান", "← Back to Student Home")}
          </Link>
        </div>

        <StudentSettingsForm
          initialName={ctx.profile.name}
          initialRoll={ctx.profile.roll ?? ""}
          initialInstitution={ctx.profile.institution ?? ""}
          email={ctx.email}
        />
      </main>
    </div>
  );
}
