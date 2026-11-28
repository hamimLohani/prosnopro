"use client";

import { MailCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

interface VerifyEmailCardProps {
  initialEmail: string;
}

export function VerifyEmailCard({ initialEmail }: VerifyEmailCardProps) {
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }

    if (!email.trim()) {
      setError(
        t(
          "যে Email দিয়ে Sign up করেছেন সেটি লিখুন।",
          "Please enter the email address you signed up with.",
        ),
      );
      return;
    }

    setSending(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setSending(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setStatus(
      t(
        "Verification link পাঠানো হয়েছে! আপনার Inbox এবং Spam folder চেক করুন।",
        "Verification link sent! Please check your Inbox and Spam folder.",
      ),
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-4 inline-flex rounded-xl bg-navy/10 p-3 text-navy">
        <MailCheck className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-navy">
        {t("আপনার Email চেক করুন", "Check Your Email")}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {lang === "en"
          ? `A verification link has been sent to ${email ? email : "your email address"}. Click the link in the email to activate your ProsnoPro account.`
          : `${email ? `${email} ঠিকানায়` : "আপনার ঠিকানায়"} একটি verification link পাঠানো হয়েছে। ProsnoPro Account চালু করতে Email-এর লিংকে ক্লিক করুন।`}
      </p>

      {status && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          {status}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={handleResend} className="mt-5 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
        />
        <button
          type="submit"
          disabled={sending}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{t("আবার Verification Email পাঠান", "Resend Verification Email")}</span>
        </button>
      </form>

      <div className="mt-5 border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
        <Link href="/login" className="font-semibold text-navy hover:underline">
          {t("Sign in পেজে ফিরে যান", "Back to Sign in")}
        </Link>
      </div>
    </div>
  );
}
