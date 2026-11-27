"use client";

import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  const [confirmRemoveKeyOpen, setConfirmRemoveKeyOpen] = useState(false);
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
      setError("Name cannot be empty.");
      return;
    }

    if (codeChanged) {
      if (!isValidTeacherCode(normalizedNext)) {
        setError("Teacher Code must be 4–12 English letters or digits.");
        return;
      }
      if (codeAvailable === false) {
        setError("That Teacher Code is already taken.");
        return;
      }
    }

    setSaving(true);

    if (cleanName !== initialName) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expired. Please sign in again.");
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
    setStatus("Profile settings saved.");
    router.refresh();
  }

  function handleProviderChange(nextProvider: AiProviderId) {
    setAiProvider(nextProvider);
    setAiModel(PROVIDER_CATALOG[nextProvider].defaultTextModel);
    setAiStatus(null);
    setAiError(null);
  }

  async function handleSaveAiKey(e: React.FormEvent) {
    e.preventDefault();
    setAiStatus(null);
    setAiError(null);

    if (!apiKeyInput.trim() && !hasKey) {
      setAiError("Paste your personal API key before saving.");
      return;
    }

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
        setAiError(data.message ?? "Could not save API key.");
        setAiBusy(null);
        return;
      }

      setHasKey(Boolean(data.hasKey));
      setKeyHint(data.keyHint ?? keyHint);
      setApiKeyInput("");
      setAiStatus(data.message ?? "API key saved.");
      router.refresh();
    } catch {
      setAiError("Network error while saving AI key.");
    } finally {
      setAiBusy(null);
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
        setAiError(data.message ?? "Key verification failed.");
      } else {
        setAiStatus(data.message ?? "Your saved API key works!");
      }
    } catch {
      setAiError("Network error while testing key.");
    } finally {
      setAiBusy(null);
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
        setAiError(data.message ?? "Could not remove API key.");
      } else {
        setHasKey(false);
        setKeyHint(null);
        setApiKeyInput("");
        setAiStatus("Saved API key removed.");
        router.refresh();
      }
    } catch {
      setAiError("Network error while removing key.");
    } finally {
      setAiBusy(null);
      setConfirmRemoveKeyOpen(false);
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
          <h2 className="text-lg font-bold text-navy">Teacher Profile &amp; Code</h2>
          <p className="text-sm text-slate-600 break-all">
            Account email: <span className="font-medium text-slate-800">{email ?? "—"}</span>
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
            Display name
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
              Changing your Teacher Code means students using your old Teacher Code will no longer
              be able to join with that old code.
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60 cursor-pointer"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Save profile</span>
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
              <h2 className="text-lg font-bold">Your AI API Key (BYOK)</h2>
            </div>
            <p className="text-sm text-slate-600">
              Use your own free or paid AI key to generate MCQ drafts and import PDFs. Calls run
              from the server using your own key — never charged to the platform or sent back to
              the browser.
            </p>
          </div>

          {hasKey ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved ({keyHint ?? "encrypted"})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Not configured (optional)
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
              placeholder={hasKey ? `Saved (${keyHint}) — paste to replace` : "Paste your API key"}
              className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 font-mono text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
            <p className="text-xs text-slate-500">{providerMeta.keyConsoleHint}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-model-input" className="block text-sm font-medium text-slate-700">
              Model <span className="text-xs font-normal text-slate-400">(optional override)</span>
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
          <span>Encrypted with AES-256-GCM at rest. Never returned to the browser.</span>
        </div>

        <label className="flex min-h-[40px] items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={verifyBeforeSave}
            onChange={(e) => setVerifyBeforeSave(e.target.checked)}
            className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-slate-300 text-navy"
          />
          <span>Verify key with {providerMeta.label} before saving</span>
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
            <span>{hasKey && !apiKeyInput.trim() ? "Update Provider / Model" : "Save API Key"}</span>
          </button>

          {hasKey && (
            <>
              <button
                type="button"
                disabled={!serverEncryptionReady || aiBusy !== null}
                onClick={handleTestSavedKey}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                {aiBusy === "test" && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Test Key</span>
              </button>

              <button
                type="button"
                disabled={!serverEncryptionReady || aiBusy !== null}
                onClick={() => setConfirmRemoveKeyOpen(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
              >
                {aiBusy === "remove" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Remove Key</span>
              </button>
            </>
          )}
        </div>
      </form>

      <ConfirmModal
        open={confirmRemoveKeyOpen}
        title="Remove AI API Key?"
        message="Remove your saved AI API key? Manual entry and Question Bank still work."
        confirmLabel="Remove Key"
        busy={aiBusy === "remove"}
        onCancel={() => setConfirmRemoveKeyOpen(false)}
        onConfirm={() => void handleRemoveKey()}
      />
    </div>
  );
}
