import { BanglaSpikeClient } from "@/components/bangla-spike-client";
import { Navbar } from "@/components/navbar";
import { getCurrentUserContext } from "@/lib/supabase/server";

export default async function BanglaSpikePage() {
  const ctx = await getCurrentUserContext();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <div className="no-print space-y-1">
          <h1 className="text-2xl font-bold text-navy">Bangla Print-PDF &amp; pdf.js Spike</h1>
          <p className="text-sm text-slate-600">
            Step 1 validation tool for zero-cost browser PDF generation and zero-storage PDF
            question import.
          </p>
        </div>

        <BanglaSpikeClient />
      </main>
    </div>
  );
}
