"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/components/language-provider";

export function LanguageToggle() {
  const router = useRouter();
  const { lang, setLang } = useLang();

  function switchTo(next: "bn" | "en") {
    if (next === lang) return;
    setLang(next);
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-bold"
    >
      <button
        type="button"
        onClick={() => switchTo("bn")}
        className={`min-h-[32px] rounded-md px-2.5 py-1 transition cursor-pointer ${
          lang === "bn" ? "bg-navy text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
        }`}
      >
        বাংলা
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={`min-h-[32px] rounded-md px-2.5 py-1 transition cursor-pointer ${
          lang === "en" ? "bg-navy text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
        }`}
      >
        EN
      </button>
    </div>
  );
}
