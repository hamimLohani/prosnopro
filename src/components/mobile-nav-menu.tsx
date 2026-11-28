"use client";

import { Info, LogOut, Menu, Settings, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { useLang } from "@/components/language-provider";
import { performSignOut } from "@/components/sign-out-button";
import { pickText } from "@/lib/i18n";
import type { UserRole } from "@/lib/types";

interface MobileNavMenuProps {
  signedIn: boolean;
  role: UserRole | null;
}

export function MobileNavMenu({ signedIn, role }: MobileNavMenuProps) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    const ok = await performSignOut(router);
    if (!ok) {
      setSigningOut(false);
      return;
    }
    setConfirmSignOut(false);
  }

  return (
    <>
      <div ref={wrapRef} className="relative sm:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open ? menuId : undefined}
          aria-label={t("মেনু", "Menu")}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        {open && (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl space-y-0.5 text-sm"
          >
            {signedIn && role === "student" && (
              <Link
                href="/student/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-[42px] items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4 text-navy shrink-0" />
                <span>{t("প্রোফাইল সেটিংস", "Profile Settings")}</span>
              </Link>
            )}
            {signedIn && role === "teacher" && (
              <Link
                href="/teacher/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-[42px] items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4 text-navy shrink-0" />
                <span>{t("সেটিংস ও AI Key", "Settings & AI")}</span>
              </Link>
            )}
            <Link
              href="/about"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-[42px] items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              <Info className="h-4 w-4 text-slate-500 shrink-0" />
              <span>{t("সম্পর্কে (About)", "About")}</span>
            </Link>
            <Link
              href="/privacy"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-[42px] items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{t("গোপনীয়তা নীতি", "Privacy Notice")}</span>
            </Link>
            {signedIn && (
              <div className="mt-1 border-t border-slate-100 pt-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setConfirmSignOut(true);
                  }}
                  className="flex min-h-[42px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-rose-700 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>{t("সাইন আউট", "Sign out")}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmSignOut}
        tone="danger"
        title={t("Sign out করবেন?", "Sign out?")}
        message={t(
          "আপনি কি নিশ্চিত যে আপনার ProsnoPro অ্যাকাউন্ট থেকে Sign out করতে চান?",
          "Are you sure you want to sign out of your ProsnoPro account?",
        )}
        confirmLabel={t("হ্যাঁ, Sign out করুন", "Yes, Sign out")}
        cancelLabel={t("বাতিল", "Cancel")}
        busy={signingOut}
        onConfirm={() => void handleSignOut()}
        onCancel={() => setConfirmSignOut(false)}
      />
    </>
  );
}
