import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getCurrentUserContext } from "@/lib/supabase/server";

export default async function PrivacyPage() {
  const ctx = await getCurrentUserContext();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-navy">Privacy &amp; Data Retention Notice</h1>
          <p className="text-sm text-slate-600">
            How ProsnoPro handles teacher, student, and exam integrity data.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 text-sm leading-relaxed text-slate-700">
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">1. Account Information</h2>
            <p>
              ProsnoPro stores your account name, email address, role (teacher or student), and
              optional student roll/ID and institution. Students&apos; account names and rolls are
              snapshotted onto exam attempts to preserve accurate academic records.
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">2. Exam Integrity &amp; Device Logs</h2>
            <p>
              During timed exams, ProsnoPro records attempt timestamps, answers, IP address, browser
              user-agent, session takeover events (multi-tab / second device), and informational
              attention counts (tab switches, window blurs, away duration, and copy attempts). These
              records are visible only to the exam&apos;s teacher.
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">3. Teacher AI Keys &amp; PDFs</h2>
            <p>
              Teachers may optionally add their own AI provider API key. Keys are encrypted at rest
              with AES-256-GCM and used strictly on the server—never returned to the browser. PDF
              question imports are processed in your browser and sent only during extraction; PDFs
              are not persisted on ProsnoPro servers.
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">4. Minor Students</h2>
            <p>
              Teachers and schools administering exams to students under applicable minimum age laws
              are responsible for obtaining any required parent, guardian, or institutional consent
              before inviting students to create accounts.
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">5. Retention &amp; Deletion</h2>
            <p>
              Failed code-entry rate-limit records are pruned automatically after 7 days, and raw
              entry logs are pruned automatically after 90 days. Teachers can delete their exams
              and question bank items directly from their dashboard at any time.
            </p>
          </div>
        </section>

        <div>
          <Link href="/" className="text-sm font-semibold text-navy hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
