"use client";

import { KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/language-provider";
import { PasswordInput } from "@/components/ui/password-input";
import { pickText } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

interface ResetPasswordFormProps {
  mode: "request" | "update";
}

export function ResetPasswordForm({ mode }: ResetPasswordFormProps) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }

    if (mode === "request") {
      setLoading(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm?next=/update-password`,
      });
      setLoading(false);

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage(
        t(
          "এই Email-এ Account থাকলে একটি Password reset link পাঠানো হয়েছে।",
          "If an account exists for this email, a password reset link has been sent.",
        ),
      );
      return;
    }

    if (password.length < 8) {
      setError(
        t(
          "Password কমপক্ষে ৮ অক্ষরের হতে হবে।",
          "Password must be at least 8 characters long.",
        ),
      );
      return;
    }
    if (password !== confirmPassword) {
      setError(t("দুটি Password মিলছে না।", "Passwords do not match."));
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      t(
        "Password আপডেট হয়েছে। Sign in পেজে নেওয়া হচ্ছে...",
        "Password updated. Redirecting to sign in...",
      ),
    );
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-4 inline-flex rounded-xl bg-navy/10 p-3 text-navy">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-navy">
        {mode === "request"
          ? t("Password Reset করুন", "Reset Password")
          : t("নতুন Password সেট করুন", "Set New Password")}
      </h1>
      <p className="mt-1.5 text-sm text-slate-600">
        {mode === "request"
          ? t(
              "আপনার Account Email লিখুন, আমরা একটি Reset link পাঠিয়ে দেব।",
              "Enter your account email and we will send you a reset link.",
            )
          : t(
              "একটি শক্তিশালী Password দিন (কমপক্ষে ৮ অক্ষর)।",
              "Choose a strong password (at least 8 characters).",
            )}
      </p>

      {message && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {mode === "request" ? (
          <div className="space-y-1.5">
            <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
              {t("Email ঠিকানা", "Email Address")}
            </label>
            <input
              id="reset-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                {t("নতুন Password", "New Password")}
              </label>
              <PasswordInput
                id="new-password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
                {t("Password নিশ্চিত করুন", "Confirm Password")}
              </label>
              <PasswordInput
                id="confirm-password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>
            {mode === "request"
              ? t("Reset Link পাঠান", "Send Reset Link")
              : t("Password আপডেট করুন", "Update Password")}
          </span>
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
