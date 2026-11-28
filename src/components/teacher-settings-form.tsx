"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { TeacherCodeInput } from "@/components/teacher-code-input";
import { PROVIDER_CATALOG, type AiProviderId } from "@/lib/ai/providers";
import { createClient } from "@/lib/supabase/client";
import { isValidTeacherCode, normalizeTeacherCode } from "@/lib/validation";

interface TeacherSettingsFormProps {
  initialName: string;
  initialTeacherCode: string;
  email: string | null;
  initialAiProvider: AiProviderId | null;
  initialAiModel: string | null;
  initialHasKey: boolean;
  initialKeyHint: string | null;
  serverEncryptionReady: boolean;
  returnTo?: string | null;
}

const PROVIDER_ORDER: AiProviderId[] = ["gemini", "groq", "openai", "anthropic"];

export function TeacherSettingsForm({
  initialName,
  initialTeacherCode,
  email,
  initialAiProvider,
  initialAiModel,
  initialHasKey,
  initialKeyHint,
  serverEncryptionReady,
  returnTo = null,
}: TeacherSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [teacherCode, setTeacherCode] = useState(initialTeacherCode);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // BYOK AI key state
  const [aiProvider, setAiProvider] = useState<AiProviderId>(initialAiProvider ?? "gemini");
  const [aiModel, setAiModel] = useState(
    initialAiModel ?? PROVIDER_CATALOG[initialAiProvider ?? "gemini"].defaultTextModel,
  );
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [verifyBeforeSave, setVerifyBeforeSave] = useState(true);
  const [hasKey, setHasKey] = useState(initialHasKey);
  const [keyHint, setKeyHint] = useState<string | null>(initialKeyHint);
  const [aiBusy, setAiBusy] = useState<"save" | "test" | "remove" | null>(null);
  const [confirmAiAction, setConfirmAiAction] = useState<"save" | "test" | "remove" | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const normalizedCurrent = normalizeTeacherCode(initialTeacherCode);
  const normalizedNext = normalizeTeacherCode(teacherCode);
  const codeChanged = normalizedNext !== normalizedCurrent;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setError("নাম খালি রাখা যাবে না।");
      return;
    }

    if (codeChanged) {
      if (!isValidTeacherCode(normalizedNext)) {
        setError("Teacher Code অবশ্যই ৪–১২টি English অক্ষর বা সংখ্যা হতে হবে।");
        return;
      }
      if (codeAvailable === false) {
        setError("এই Teacher Code-টি আগেই নেওয়া হয়েছে।");
        return;
      }
    }

    setSaving(true);

    if (cleanName !== initialName) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Session শেষ হয়ে গেছে। অনুগ্রহ করে আবার Sign in করুন।");
        setSaving(false);
        return;
      }

      const { error: nameErr } = await supabase
        .from("profiles")
        .update({ name: cleanName })
        .eq("id", user.id);

      if (nameErr) {
        setError(nameErr.message);
        setSaving(false);
        return;
      }
    }

    if (codeChanged) {
      const { error: codeErr } = await supabase.rpc("update_teacher_code", {
        p_new_code: normalizedNext,
      });

      if (codeErr) {
        setError(codeErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setStatus("Profile settings Save হয়েছে।");
    router.refresh();
  }

  function handleProviderChange(nextProvider: AiProviderId) {
    setAiProvider(nextProvider);
    setAiModel(PROVIDER_CATALOG[nextProvider].defaultTextModel);
    setAiStatus(null);
    setAiError(null);
  }

  function handleSaveAiKey(e: React.FormEvent) {
    e.preventDefault();
    setAiStatus(null);
    setAiError(null);

    if (!apiKeyInput.trim() && !hasKey) {
      setAiError("Save করার আগে আপনার নিজস্ব API Key পেস্ট করুন।");
      return;
    }

    setConfirmAiAction("save");
  }

  async function executeSaveAiKey() {
    setAiBusy("save");
    try {
      const res = await fetch("/api/teacher/ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          model: aiModel.trim(),
          apiKey: apiKeyInput.trim() || undefined,
          verifyKey: Boolean(apiKeyInput.trim()) && verifyBeforeSave,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        hasKey?: boolean;
        keyHint?: string | null;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        setAiError(data.message ?? "API Key Save করা যায়নি।");
        setAiBusy(null);
        return;
      }

      setHasKey(Boolean(data.hasKey));
      setKeyHint(data.keyHint ?? keyHint);
      setApiKeyInput("");
      setAiStatus(data.message ?? "API Key Save হয়েছে।");
      router.refresh();
    } catch {
      setAiError("AI Key Save করার সময় Network সমস্যা হয়েছে।");
    } finally {
      setAiBusy(null);
      setConfirmAiAction(null);
    }
  }

  async function handleTestSavedKey() {
    setAiStatus(null);
    setAiError(null);
    setAiBusy("test");
    try {
      const res = await fetch("/api/teacher/ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testSavedOnly: true,
          model: aiModel.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setAiError(data.message ?? "Key যাচাই ব্যর্থ হয়েছে।");
      } else {
        setAiStatus(data.message ?? "আপনার সংরক্ষিত API Key সঠিকভাবে কাজ করছে!");
      }
    } catch {
      setAiError("Key টেস্ট করার সময় Network সমস্যা হয়েছে।");
    } finally {
      setAiBusy(null);
      setConfirmAiAction(null);
    }
  }

  async function handleRemoveKey() {
    setAiStatus(null);
    setAiError(null);
    setAiBusy("remove");
    try {
      const res = await fetch("/api/teacher/ai-key", { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setAiError(data.message ?? "API Key মুছে ফেলা যায়নি।");
      } else {
        setHasKey(false);
        setKeyHint(null);
        setApiKeyInput("");
        setAiStatus("সংরক্ষিত API Key মুছে ফেলা হয়েছে।");
        router.refresh();
      }
    } catch {
      setAiError("Key মুছে ফেলার সময় Network সমস্যা হয়েছে।");
    } finally {
      setAiBusy(null);
      setConfirmAiAction(null);
    }
  }

  const providerMeta = PROVIDER_CATALOG[aiProvider];

  return (
    <div className="space-y-5 sm:space-y-6">
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-5"
      >
        <div>
          <h2 className="text-lg font-bold text-navy">Teacher Profile ও Code</h2>
          <p className="text-sm text-slate-600 break-all">
            Account Email: <span className="font-medium text-slate-800">{email ?? "—"}</span>
          </p>
        </div>

        {status && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
            {status}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="settings-name" className="block text-sm font-medium text-slate-700">
            প্রদর্শিত নাম (Display Name)
          </label>
          <input
            id="settings-name"
            type="text"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>

        <TeacherCodeInput
          value={teacherCode}
          onChange={setTeacherCode}
          onAvailabilityChange={setCodeAvailable}
          currentCode={initialTeacherCode}
          disabled={saving}
        />

        {codeChanged && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              Teacher Code পরিবর্তন করলে শিক্ষার্থীরা পুরনো Teacher Code দিয়ে আর Exam-এ জয়েন করতে
              পারবে না।
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Profile Save করুন</span>
        </button>
      </form>

      {/* Teacher BYOK AI API Key Settings */}
      <form
        id="ai-key"
        onSubmit={handleSaveAiKey}
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-navy">
              <Sparkles className="h-5 w-5 text-amber" />
              <h2 className="text-lg font-bold">আপনার AI API Key (BYOK)</h2>
            </div>
            <p className="text-sm text-slate-600">
              AI দিয়ে MCQ Draft তৈরি এবং PDF Import করতে আপনার নিজস্ব Free বা Paid AI Key ব্যবহার
              করুন। সব কল আপনার Key দিয়ে Server থেকে চলে — কখনো Browser-এ ফেরত পাঠানো হয় না।
            </p>
          </div>

          {hasKey ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved ({keyHint ?? "encrypted"})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              সেট করা নেই (ঐচ্ছিক)
            </span>
          )}
        </div>

        {!serverEncryptionReady && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              Server encryption env vars (<code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              and <code className="font-mono">AI_ENCRYPTION_KEY</code>) are not set yet. Add them in{" "}
              <code className="font-mono">.env.local</code> or Vercel before saving teacher API
              keys.
            </span>
          </div>
        )}

        {aiStatus && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
            {aiStatus}
          </div>
        )}
        {aiError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
            {aiError}
          </div>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2">
          {PROVIDER_ORDER.map((id) => {
            const p = PROVIDER_CATALOG[id];
            const selected = aiProvider === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleProviderChange(id)}
                className={`min-h-[64px] rounded-xl border p-3.5 text-left transition active:scale-[0.99] cursor-pointer ${
                  selected
                    ? "border-navy bg-navy/5 ring-2 ring-navy/15"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">{p.label}</span>
                  {(id === "gemini" || id === "groq") && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Free tier
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">{p.freeTierNote}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                How to create &amp; copy your {providerMeta.label} key
              </h3>
              <p className="text-xs text-slate-500">{providerMeta.freeTierNote}</p>
            </div>
            <a
              href={providerMeta.keyConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-navy/20 bg-white px-3 py-2 text-xs font-semibold text-navy shadow-xs hover:bg-navy hover:text-white transition"
            >
              <span>Create &amp; Copy Key</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <ol className="space-y-1.5 text-xs text-slate-700 list-decimal list-inside">
            {providerMeta.keySetupSteps.map((step, idx) => (
              <li key={idx} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="ai-key-input" className="block text-sm font-medium text-slate-700">
              {providerMeta.label} API Key
            </label>
            <input
              id="ai-key-input"
              type="password"
              autoComplete="off"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={hasKey ? `Saved (${keyHint}) — বদলাতে Paste করুন` : "আপনার API Key Paste করুন"}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 font-mono text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
            <p className="text-xs text-slate-500">
              Key প্রয়োজন?{" "}
              <a
                href={providerMeta.keyConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-navy underline underline-offset-2 hover:text-navy-strong"
              >
                {providerMeta.keyConsoleHint}
              </a>
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-model-input" className="block text-sm font-medium text-slate-700">
              Model <span className="text-xs font-normal text-slate-400">(ঐচ্ছিক)</span>
            </label>
            <input
              id="ai-model-input"
              type="text"
              list="suggested-ai-models"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder={providerMeta.defaultTextModel}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 font-mono text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
            <datalist id="suggested-ai-models">
              {providerMeta.suggestedModels.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <p className="text-xs text-slate-500">
              Default: <code className="font-mono">{providerMeta.defaultTextModel}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>AES-256-GCM দিয়ে Encrypted থাকে। কখনো Browser-এ ফেরত পাঠানো হয় না।</span>
        </div>

        <label className="flex min-h-[40px] items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={verifyBeforeSave}
            onChange={(e) => setVerifyBeforeSave(e.target.checked)}
            className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
          />
          <span>Save করার আগে {providerMeta.label} দিয়ে Key যাচাই করুন</span>
        </label>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
          <button
            type="submit"
            disabled={!serverEncryptionReady || aiBusy !== null}
            className="col-span-2 sm:col-span-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-50 cursor-pointer"
          >
            {aiBusy === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            <span>{hasKey && !apiKeyInput.trim() ? "Provider / Model Update করুন" : "API Key Save করুন"}</span>
          </button>

          {hasKey && (
            <>
              <button
                type="button"
                disabled={!serverEncryptionReady || aiBusy !== null}
                onClick={() => setConfirmAiAction("test")}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                {aiBusy === "test" && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Key টেস্ট করুন</span>
              </button>

              <button
                type="button"
                disabled={!serverEncryptionReady || aiBusy !== null}
                onClick={() => setConfirmAiAction("remove")}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
              >
                {aiBusy === "remove" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Key মুছুন</span>
              </button>
            </>
          )}
        </div>

        {returnTo && hasKey && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-xs font-medium text-emerald-900">
              AI Key প্রস্তুত! এখন আপনার Exam-এ ফিরে গিয়ে প্রশ্ন তৈরি করতে পারেন।
            </span>
            <Link
              href={returnTo}
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Exam-এ ফিরে যান →
            </Link>
          </div>
        )}
      </form>

      <ConfirmModal
        open={confirmAiAction !== null}
        tone={confirmAiAction === "remove" ? "danger" : "primary"}
        title={
          confirmAiAction === "remove"
            ? "AI API Key মুছে ফেলবেন?"
            : confirmAiAction === "test"
              ? "সংরক্ষিত AI Key টেস্ট করবেন?"
              : hasKey && !apiKeyInput.trim()
                ? "Provider / Model Update করবেন?"
                : "API Key Save করবেন?"
        }
        message={
          confirmAiAction === "remove"
            ? "আপনার সংরক্ষিত AI API Key মুছে ফেলতে চান? Manual প্রশ্ন ও Question Bank আগের মতোই কাজ করবে।"
            : confirmAiAction === "test"
              ? `সংরক্ষিত ${providerMeta.label} Key ও ${aiModel.trim() || providerMeta.defaultTextModel} মডেল দিয়ে একটি পরীক্ষামূলক কানেকশন যাচাই করা হবে।`
              : `${providerMeta.label} (${aiModel.trim() || providerMeta.defaultTextModel}) সেটিংস সেভ করতে চান?`
        }
        confirmLabel={
          confirmAiAction === "remove"
            ? "Key মুছুন"
            : confirmAiAction === "test"
              ? "হ্যাঁ, টেস্ট করুন"
              : "নিশ্চিত করে Save করুন"
        }
        busy={aiBusy !== null}
        onCancel={() => setConfirmAiAction(null)}
        onConfirm={() => {
          if (confirmAiAction === "remove") {
            void handleRemoveKey();
          } else if (confirmAiAction === "test") {
            void handleTestSavedKey();
          } else if (confirmAiAction === "save") {
            void executeSaveAiKey();
          }
        }}
      />
    </div>
  );
}
