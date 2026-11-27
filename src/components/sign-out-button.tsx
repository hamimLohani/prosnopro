"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className = "" }: SignOutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const defaultDisplay = /\bhidden\b/.test(className) ? "" : "inline-flex ";

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={`${defaultDisplay}min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer whitespace-nowrap ${className}`}
    >
      <LogOut className="h-4 w-4" />
      <span>{loading ? "Signing out..." : "Sign out"}</span>
    </button>
  );
}
