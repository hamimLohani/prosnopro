import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { getSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function StudentSignupPage() {
  const { configured } = getSupabaseEnv();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-5 px-4 py-10">
        {!configured && (
          <div className="w-full max-w-md">
            <SetupBanner />
          </div>
        )}
        <AuthCard mode="signup-student" configured={configured} />
        <p className="text-xs text-slate-500">
          Are you a teacher?{" "}
          <Link href="/signup/teacher" className="font-semibold text-navy hover:underline">
            Switch to Teacher signup
          </Link>
        </p>
      </main>
    </div>
  );
}
