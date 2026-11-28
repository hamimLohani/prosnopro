"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/language-provider";
import { StatusToast } from "@/components/status-toast";
import { pickText } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

interface StudentSettingsFormProps {
  initialName: string;
  initialRoll: string;
  initialInstitution: string;
  email: string | null;
}

export function StudentSettingsForm({
  initialName,
  initialRoll,
  initialInstitution,
  email,
}: StudentSettingsFormProps) {
  const router = useRouter();
  const { lang } = useLang();
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  const [name, setName] = useState(initialName);
  const [roll, setRoll] = useState(initialRoll);
  const [institution, setInstitution] = useState(initialInstitution);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError(t("Supabase কনফিগার করা হয়নি।", "Supabase is not configured yet."));
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setError(t("নাম খালি রাখা যাবে না।", "Name cannot be empty."));
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError(t("Session শেষ হয়ে গেছে। আবার Sign in করুন।", "Session expired. Please sign in again."));
      return;
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        name: cleanName,
        roll: roll.trim() || null,
        institution: institution.trim() || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setStatus(t("Student প্রোফাইল Save হয়েছে।", "Student profile saved."));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-5"
      >
        <div>
          <h2 className="text-lg font-bold text-navy">
            {t("Student প্রোফাইল তথ্য", "Student Profile Details")}
          </h2>
          <p className="text-sm text-slate-600 break-all">
            {t("Account Email:", "Account Email:")}{" "}
            <span className="font-medium text-slate-800">{email ?? "—"}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="student-name" className="block text-sm font-medium text-slate-700">
            {t("পূর্ণ নাম", "Full Name")}
          </label>
          <input
            id="student-name"
            type="text"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("আপনার নাম লিখুন", "Enter your full name")}
            className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="student-roll" className="block text-sm font-medium text-slate-700">
              {t("রোল / আইডি", "Roll / ID")}{" "}
              <span className="text-xs font-normal text-slate-400">({t("ঐচ্ছিক", "optional")})</span>
            </label>
            <input
              id="student-roll"
              type="text"
              maxLength={60}
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              placeholder={t("যেমন: 1042 বা 2021-3-60-012", "e.g. 1042 or 2021-3-60-012")}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="student-inst" className="block text-sm font-medium text-slate-700">
              {t("শিক্ষাপ্রতিষ্ঠান", "Institution")}{" "}
              <span className="text-xs font-normal text-slate-400">({t("ঐচ্ছিক", "optional")})</span>
            </label>
            <input
              id="student-inst"
              type="text"
              maxLength={160}
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder={t("স্কুল / কলেজ / বিশ্ববিদ্যালয়", "School / College / University")}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{t("পরিবর্তন Save করুন", "Save Changes")}</span>
        </button>
      </form>

      <StatusToast
        message={error ?? status}
        tone={error ? "error" : "success"}
        onDismiss={() => {
          setError(null);
          setStatus(null);
        }}
      />
    </div>
  );
}
