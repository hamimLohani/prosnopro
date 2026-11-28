"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto inline-flex rounded-2xl bg-rose-100 p-3 text-rose-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">
            {t("কিছু একটা সমস্যা হয়েছে", "Something went wrong")}
          </h1>
          <p className="text-sm text-slate-600">
            {t(
              "পেজটি লোড করার সময় অপ্রত্যাশিত একটি ত্রুটি ঘটেছে। দয়া করে আবার চেষ্টা করুন।",
              "An unexpected error occurred while loading this page. Please try again.",
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t("আবার চেষ্টা করুন", "Try again")}</span>
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("Home-এ যান", "Go Home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
