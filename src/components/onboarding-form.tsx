"use client";

import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TeacherCodeInput } from "@/components/teacher-code-input";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";
import { isValidTeacherCode, normalizeTeacherCode } from "@/lib/validation";

interface OnboardingFormProps {
  initialRole: UserRole;
  initialName: string;
  initialTeacherCode: string;
  initialRoll: string;
  initialInstitution: string;
  email: string | null;
}

export function OnboardingForm({
  initialRole,
  initialName,
  initialTeacherCode,
  initialRoll,
  initialInstitution,
  email,
}: OnboardingFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [name, setName] = useState(initialName);
  const [teacherCode, setTeacherCode] = useState(normalizeTeacherCode(initialTeacherCode));
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [roll, setRoll] = useState(initialRoll);
  const [institution, setInstitution] = useState(initialInstitution);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (!agreedPrivacy) {
      setError("Please acknowledge the privacy notice to finish setup.");
      return;
    }

    const cleanCode = normalizeTeacherCode(teacherCode);
    if (role === "teacher") {
      if (!isValidTeacherCode(cleanCode)) {
        setError("Teacher Code must be 4–12 letters or digits.");
        return;
      }
      if (codeAvailable === false) {
        setError("That Teacher Code is already taken. Please pick another.");
        return;
      }
    }

    setLoading(true);
    const { error: rpcError } = await supabase.rpc("complete_onboarding", {
      p_role: role,
      p_name: cleanName,
      p_teacher_code: role === "teacher" ? cleanCode : null,
      p_roll: role === "student" ? roll.trim() || null : null,
      p_institution: role === "student" ? institution.trim() || null : null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    router.push(role === "teacher" ? "/teacher" : "/student");
    router.refresh();
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-navy">Finish setting up your account</h1>
        <p className="text-sm text-slate-600">
          {email ? (
            <>
              Signed in as <span className="font-medium text-slate-800">{email}</span>.{" "}
            </>
          ) : null}
          Choose your role once — it cannot be switched later for exam integrity.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex min-h-[88px] flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition active:scale-[0.99] cursor-pointer ${
              role === "student"
                ? "border-navy bg-navy/5 ring-2 ring-navy/15"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <GraduationCap className={`h-5 w-5 ${role === "student" ? "text-navy" : "text-slate-500"}`} />
            <span className="text-sm font-semibold text-slate-900">I&apos;m a Student</span>
            <span className="text-xs text-slate-500">Join exams &amp; practice</span>
          </button>

          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`flex min-h-[88px] flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition active:scale-[0.99] cursor-pointer ${
              role === "teacher"
                ? "border-navy bg-navy/5 ring-2 ring-navy/15"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <ShieldCheck className={`h-5 w-5 ${role === "teacher" ? "text-navy" : "text-slate-500"}`} />
            <span className="text-sm font-semibold text-slate-900">I&apos;m a Teacher</span>
            <span className="text-xs text-slate-500">Create &amp; monitor exams</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="onboarding-name" className="block text-sm font-medium text-slate-700">
            Full name{" "}
            {role === "student" && (
              <span className="text-xs font-normal text-slate-500">(used on exam sheets &amp; watermarks)</span>
            )}
          </label>
          <input
            id="onboarding-name"
            type="text"
            required
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>

        {role === "teacher" ? (
          <TeacherCodeInput
            value={teacherCode}
            onChange={setTeacherCode}
            onAvailabilityChange={setCodeAvailable}
            disabled={loading}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="onboarding-roll" className="block text-sm font-medium text-slate-700">
                Roll / ID <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="onboarding-roll"
                type="text"
                enterKeyHint="next"
                maxLength={60}
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
                placeholder="e.g. 1042"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onboarding-inst" className="block text-sm font-medium text-slate-700">
                Institution <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="onboarding-inst"
                type="text"
                enterKeyHint="done"
                maxLength={160}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="School / College"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
            </div>
          </div>
        )}

        <label className="flex min-h-[44px] items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedPrivacy}
            onChange={(e) => setAgreedPrivacy(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-navy focus:ring-navy"
          />
          <span>
            I acknowledge the{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-navy underline">
              Privacy Notice
            </Link>{" "}
            (ProsnoPro stores account details and exam session activity for exam integrity and grading).
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Complete setup &amp; continue</span>
        </button>
      </form>
    </div>
  );
}
