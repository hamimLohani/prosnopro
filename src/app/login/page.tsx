import { AuthCard } from "@/components/auth-card";
import { Navbar } from "@/components/navbar";
import { SetupBanner } from "@/components/setup-banner";
import { getSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { configured } = getSupabaseEnv();
  const params = await searchParams;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-5 px-4 py-10">
        {!configured && (
          <div className="w-full max-w-md">
            <SetupBanner />
          </div>
        )}
        <AuthCard mode="login" configured={configured} initialError={params.error ?? null} />
      </main>
    </div>
  );
}
