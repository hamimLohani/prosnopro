"use client";

import { KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ResetPasswordFormProps {
  mode: "request" | "update";
}

export function ResetPasswordForm({ mode }: ResetPasswordFormProps) {
  const router = useRouter();
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
        redirectTo: `${window.location.origin}/auth/confirm`,
      });
      setLoading(false);

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage("If that email is registered, a password reset link has been sent.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated. Redirecting...");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-4 inline-flex rounded-xl bg-navy/10 p-3 text-navy">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-navy">
        {mode === "request" ? "Reset password" : "Set a new password"}
      </h1>
      <p className="mt-1.5 text-sm text-slate-600">
        {mode === "request"
          ? "Enter your account email and we'll send you a reset link."
          : "Choose a strong password (at least 8 characters)."}
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
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{mode === "request" ? "Send reset link" : "Update password"}</span>
        </button>
      </form>

      <div className="mt-5 border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
        <Link href="/login" className="font-semibold text-navy hover:underline">
          Back to Sign in
        </Link>
      </div>
    </div>
  );
}
