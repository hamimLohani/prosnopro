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
      setError("আপনার পূর্ণ নাম লিখুন।");
      return;
    }

    if (!agreedPrivacy) {
      setError("Setup সম্পন্ন করতে Privacy Notice-এ সম্মতি দিন।");
      return;
    }

    const cleanCode = normalizeTeacherCode(teacherCode);
    if (role === "teacher") {
      if (!isValidTeacherCode(cleanCode)) {
        setError("Teacher Code অবশ্যই ৪–১২টি English অক্ষর বা সংখ্যা হতে হবে।");
        return;
      }
      if (codeAvailable === false) {
        setError("এই Teacher Code-টি আগেই নেওয়া হয়েছে। অন্য একটি বেছে নিন।");
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
    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-5 sm:mb-6 space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy">আপনার Account Setup সম্পন্ন করুন</h1>
        <p className="text-sm text-slate-600">
          {email ? (
            <>
              Signed in: <span className="font-medium text-slate-800">{email}</span>।{" "}
            </>
          ) : null}
          আপনার Role একবারই বাছাই করুন — Exam-এর স্বচ্ছতার জন্য পরে আর পরিবর্তন করা যাবে না।
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
            <span className="text-sm font-semibold text-slate-900">আমি Student</span>
            <span className="text-xs text-slate-500">Exam দিন ও Practice করুন</span>
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
            <span className="text-sm font-semibold text-slate-900">আমি Teacher</span>
            <span className="text-xs text-slate-500">Exam তৈরি ও Monitor করুন</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="onboarding-name" className="block text-sm font-medium text-slate-700">
            পূর্ণ নাম{" "}
            {role === "student" && (
              <span className="text-xs font-normal text-slate-500">(Exam sheet ও Watermark-এ দেখা যাবে)</span>
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
            placeholder="আপনার পূর্ণ নাম লিখুন"
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
                Roll / ID <span className="text-xs font-normal text-slate-400">(ঐচ্ছিক)</span>
              </label>
              <input
                id="onboarding-roll"
                type="text"
                enterKeyHint="next"
                maxLength={60}
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
                placeholder="যেমন: 1042"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onboarding-inst" className="block text-sm font-medium text-slate-700">
                Institution <span className="text-xs font-normal text-slate-400">(ঐচ্ছিক)</span>
              </label>
              <input
                id="onboarding-inst"
                type="text"
                enterKeyHint="done"
                maxLength={160}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="স্কুল / কলেজ"
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
            আমি{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-navy underline">
              Privacy Notice
            </Link>{" "}
            বুঝেছি ও সম্মত আছি (ProsnoPro পরীক্ষার স্বচ্ছতা ও Grading-এর জন্য Account তথ্য ও Exam
            Session সংরক্ষণ করে)।
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Setup সম্পন্ন করে এগিয়ে যান</span>
        </button>
      </form>
    </div>
  );
}
