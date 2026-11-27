import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { OnboardingForm } from "@/components/onboarding-form";
import { SetupBanner } from "@/components/setup-banner";
import { createClient, getCurrentUserContext } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

interface OnboardingPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const ctx = await getCurrentUserContext();
  if (!ctx.configured) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-10">
          <SetupBanner />
        </main>
      </div>
    );
  }

  if (!ctx.userId) {
    redirect("/login");
  }

  if (ctx.profile) {
    redirect(ctx.profile.role === "teacher" ? "/teacher" : "/student");
  }

  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const params = await searchParams;

  const hintedRole =
    params.role === "teacher" || params.role === "student"
      ? params.role
      : meta.pending_role === "teacher" || meta.pending_role === "student"
        ? (meta.pending_role as UserRole)
        : "student";

  const initialName =
    (typeof meta.pending_name === "string" && meta.pending_name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";

  const initialTeacherCode =
    typeof meta.pending_teacher_code === "string" ? meta.pending_teacher_code : "";
  const initialRoll = typeof meta.pending_roll === "string" ? meta.pending_roll : "";
  const initialInstitution =
    typeof meta.pending_institution === "string" ? meta.pending_institution : "";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-10">
        <OnboardingForm
          initialRole={hintedRole}
          initialName={initialName}
          initialTeacherCode={initialTeacherCode}
          initialRoll={initialRoll}
          initialInstitution={initialInstitution}
          email={ctx.email}
        />
      </main>
    </div>
  );
}
