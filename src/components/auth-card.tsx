"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { TeacherCodeInput } from "@/components/teacher-code-input";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";
import { isValidTeacherCode, normalizeTeacherCode } from "@/lib/validation";

interface AuthCardProps {
  mode: "login" | "signup-teacher" | "signup-student";
  configured: boolean;
  initialError?: string | null;
}

export function AuthCard({ mode, configured, initialError = null }: AuthCardProps) {
  const router = useRouter();
  const isLogin = mode === "login";
  const role: UserRole | null =
    mode === "signup-teacher" ? "teacher" : mode === "signup-student" ? "student" : null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [roll, setRoll] = useState("");
  const [institution, setInstitution] = useState("");
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function handleGoogleAuth() {
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }

    setLoadingGoogle(true);
    const origin = window.location.origin;
    const callbackUrl = role
      ? `${origin}/auth/callback?role=${encodeURIComponent(role)}`
      : `${origin}/auth/callback`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoadingGoogle(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }

    if (isLogin) {
      setLoadingForm(true);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.user) {
        setError(signInError?.message ?? "Could not sign in.");
        setLoadingForm(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle<{ role: UserRole }>();

      if (!profile) {
        router.push("/onboarding");
      } else {
        router.push(profile.role === "teacher" ? "/teacher" : "/student");
      }
      router.refresh();
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!agreedPrivacy) {
      setError("Please acknowledge the privacy notice before creating an account.");
      return;
    }

    const normalizedCode = normalizeTeacherCode(teacherCode);
    if (role === "teacher") {
      if (!isValidTeacherCode(normalizedCode)) {
        setError("Teacher Code must be 4–12 English letters or digits.");
        return;
      }
      if (codeAvailable === false) {
        setError("That Teacher Code is already taken. Please pick another.");
        return;
      }
    }

    setLoadingForm(true);
    const origin = window.location.origin;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${origin}/auth/confirm`,
        data: {
          pending_role: role,
          pending_name: cleanName,
          pending_teacher_code: role === "teacher" ? normalizedCode : null,
          pending_roll: role === "student" ? roll.trim() || null : null,
          pending_institution: role === "student" ? institution.trim() || null : null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoadingForm(false);
      return;
    }

    // If email verification is turned off (or auto-confirmed), finish onboarding immediately.
    if (data.session && role) {
      const { error: onboardError } = await supabase.rpc("complete_onboarding", {
        p_role: role,
        p_name: cleanName,
        p_teacher_code: role === "teacher" ? normalizedCode : null,
        p_roll: role === "student" ? roll.trim() || null : null,
        p_institution: role === "student" ? institution.trim() || null : null,
      });

      if (onboardError) {
        router.push(`/onboarding?role=${role}`);
        router.refresh();
        return;
      }

      router.push(role === "teacher" ? "/teacher" : "/student");
      router.refresh();
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          {isLogin
            ? "Welcome back"
            : role === "teacher"
              ? "Create teacher account"
              : "Create student account"}
        </h1>
        <p className="text-sm text-slate-600">
          {isLogin
            ? "Sign in with Google (instant, free) or your email and password."
            : role === "teacher"
              ? "Set up your exam room and pick a unique Teacher Code."
              : "Use your real account name — it appears on your exam records."}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={!configured || loadingGoogle || loadingForm}
        className="flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {loadingGoogle ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
        )}
        <span>Continue with Google</span>
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        <span>or use email &amp; password</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-1.5">
            <label htmlFor="full-name" className="block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="full-name"
              type="text"
              required
              autoCapitalize="words"
              enterKeyHint="next"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === "teacher" ? "e.g. Md. Abdur Rahim" : "e.g. Tasnim Akter"}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            enterKeyHint="next"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            {isLogin && (
              <Link href="/reset-password" className="py-0.5 text-xs font-medium text-navy hover:underline">
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            type="password"
            required
            minLength={isLogin ? 1 : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            enterKeyHint={isLogin ? "go" : "next"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isLogin ? "Your password" : "At least 8 characters"}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>

        {mode === "signup-teacher" && (
          <TeacherCodeInput
            value={teacherCode}
            onChange={setTeacherCode}
            onAvailabilityChange={setCodeAvailable}
            disabled={!configured || loadingForm}
          />
        )}

        {mode === "signup-student" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="roll" className="block text-sm font-medium text-slate-700">
                Roll / ID <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="roll"
                type="text"
                enterKeyHint="next"
                maxLength={60}
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
                placeholder="e.g. 1042"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="institution" className="block text-sm font-medium text-slate-700">
                Institution <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="institution"
                type="text"
                enterKeyHint="done"
                maxLength={160}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="School / College"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
            </div>
          </div>
        )}

        {!isLogin && (
          <label className="flex min-h-[44px] items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedPrivacy}
              onChange={(e) => setAgreedPrivacy(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-navy focus:ring-navy"
            />
            <span>
              I understand that ProsnoPro records account name, email, and exam session/device
              activity as described in the{" "}
              <Link href="/privacy" className="font-semibold text-navy underline">
                Privacy Notice
              </Link>
              .
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={!configured || loadingForm || loadingGoogle}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {loadingForm && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>
            {isLogin
              ? "Sign in"
              : role === "teacher"
                ? "Create teacher account"
                : "Create student account"}
          </span>
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
        {isLogin ? (
          <p>
            New to ProsnoPro?{" "}
            <Link href="/signup" className="font-semibold text-navy hover:underline">
              Create an account
            </Link>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-navy hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
