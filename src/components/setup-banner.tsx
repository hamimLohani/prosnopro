import { AlertTriangle } from "lucide-react";

export function SetupBanner() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Supabase connection not configured yet</p>
          <p className="text-amber-900">
            Copy <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">.env.example</code>{" "}
            to <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">.env.local</code>, add your
            free Supabase project&apos;s <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and run{" "}
            <code className="font-mono text-xs">supabase/migrations/0001_initial_schema.sql</code> in the SQL Editor.
          </p>
        </div>
      </div>
    </div>
  );
}
