import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

export default async function NotFound() {
  const lang = await getServerLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto inline-flex rounded-2xl bg-navy/10 p-3 text-navy">
            <FileQuestion className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">404</p>
            <h1 className="text-xl font-bold text-navy">
              {t("পেজটি পাওয়া যায়নি", "Page not found")}
            </h1>
            <p className="text-sm text-slate-600">
              {t(
                "আপনি যে লিংকটি খুঁজছেন তা সরানো হয়েছে অথবা ঠিকানাটি সঠিক নয়।",
                "The link you are looking for may have been moved or does not exist.",
              )}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong"
          >
            {t("Home-এ ফিরে যান", "Back to Home")}
          </Link>
        </div>
      </main>
    </div>
  );
}
