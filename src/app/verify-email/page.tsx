import { Navbar } from "@/components/navbar";
import { VerifyEmailCard } from "@/components/verify-email-card";

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-10">
        <VerifyEmailCard initialEmail={params.email ?? ""} />
      </main>
    </div>
  );
}
