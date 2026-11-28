"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export async function performSignOut(router: ReturnType<typeof useRouter>) {
  const supabase = createClient();
  if (!supabase) return false;
  await supabase.auth.signOut();
  router.push("/login");
  router.refresh();
  return true;
}

interface SignOutButtonProps {
  className?: string;
  variant?: "default" | "inverted" | "menu";
}

export function SignOutButton({ className = "", variant = "default" }: SignOutButtonProps) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const ok = await performSignOut(router);
    if (!ok) {
      setLoading(false);
      return;
    }
    setConfirmOpen(false);
  }

  const defaultDisplay = /\bhidden\b/.test(className) ? "" : "inline-flex ";
  const variantClasses =
    variant === "inverted"
      ? "border border-white/25 bg-white/10 text-white hover:bg-white/20"
      : variant === "menu"
        ? "w-full justify-start border-0 bg-transparent text-rose-700 hover:bg-rose-50 px-3"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className={`${defaultDisplay}min-h-[38px] items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium disabled:opacity-60 cursor-pointer whitespace-nowrap ${
          variant === "menu" ? "" : "justify-center "
        }${variantClasses} ${className}`}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>
          {loading ? t("বের হচ্ছে...", "Signing out...") : t("সাইন আউট", "Sign out")}
        </span>
      </button>

      <ConfirmModal
        open={confirmOpen}
        tone="danger"
        title={t("Sign out করবেন?", "Sign out?")}
        message={t(
          "আপনি কি নিশ্চিত যে আপনার ProsnoPro অ্যাকাউন্ট থেকে Sign out করতে চান?",
          "Are you sure you want to sign out of your ProsnoPro account?",
        )}
        confirmLabel={t("হ্যাঁ, Sign out করুন", "Yes, Sign out")}
        cancelLabel={t("বাতিল", "Cancel")}
        busy={loading}
        onConfirm={() => void handleSignOut()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
