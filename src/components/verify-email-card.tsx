"use client";

import { MailCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface VerifyEmailCardProps {
  initialEmail: string;
}

export function VerifyEmailCard({ initialEmail }: VerifyEmailCardProps) {
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
      setError("যে Email দিয়ে Sign up করেছেন সেটি লিখুন।");
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

    setStatus("Verification link পাঠানো হয়েছে! আপনার Inbox এবং Spam folder চেক করুন।");
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-4 inline-flex rounded-xl bg-navy/10 p-3 text-navy">
        <MailCheck className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-navy">আপনার Email চেক করুন</h1>
      <p className="mt-2 text-sm text-slate-600">
        {email ? `${email} ঠিকানায়` : "আপনার ঠিকানায়"} একটি verification link পাঠানো হয়েছে।
        ProsnoPro Account চালু করতে Email-এর লিংকে ক্লিক করুন।
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
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
        />
        <button
          type="submit"
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>আবার Verification Email পাঠান</span>
        </button>
      </form>

      <div className="mt-5 border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
        <Link href="/login" className="font-semibold text-navy hover:underline">
          Sign in পেজে ফিরে যান
        </Link>
      </div>
    </div>
  );
}
