import { AlertTriangle } from "lucide-react";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

export async function SetupBanner() {
  const lang = await getServerLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">
            {t("Supabase সংযোগ এখনো সেটআপ করা হয়নি", "Supabase connection not configured yet")}
          </p>
          <p className="text-amber-900">
            {lang === "bn" ? (
              <>
                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                  .env.example
                </code>{" "}
                ফাইলটি{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                  .env.local
                </code>{" "}
                নামে Copy করে আপনার Supabase প্রজেক্টের{" "}
                <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> ও{" "}
                <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> দিন এবং SQL
                Editor-এ migration ফাইলগুলো রান করুন।
              </>
            ) : (
              <>
                Copy{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                  .env.example
                </code>{" "}
                to{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                  .env.local
                </code>
                , add your Supabase project&apos;s{" "}
                <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and run{" "}
                <code className="font-mono text-xs">supabase/migrations/0001_initial_schema.sql</code>{" "}
                in the SQL Editor.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
