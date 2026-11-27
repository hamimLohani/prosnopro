"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isValidTeacherCode, normalizeTeacherCode } from "@/lib/validation";

interface TeacherCodeInputProps {
  value: string;
  onChange: (normalized: string) => void;
  onAvailabilityChange?: (available: boolean | null) => void;
  currentCode?: string | null;
  disabled?: boolean;
  id?: string;
}

interface AsyncResult {
  code: string;
  status: "available" | "taken" | "error";
  message: string;
}

export function TeacherCodeInput({
  value,
  onChange,
  onAvailabilityChange,
  currentCode,
  disabled = false,
  id = "teacher-code",
}: TeacherCodeInputProps) {
  const [asyncResult, setAsyncResult] = useState<AsyncResult | null>(null);

  const onAvailabilityRef = useRef(onAvailabilityChange);
  useEffect(() => {
    onAvailabilityRef.current = onAvailabilityChange;
  }, [onAvailabilityChange]);

  const normalized = normalizeTeacherCode(value);
  const currentNorm = currentCode ? normalizeTeacherCode(currentCode) : null;
  const needsRemoteCheck =
    Boolean(normalized) && isValidTeacherCode(normalized) && normalized !== currentNorm;

  useEffect(() => {
    if (!needsRemoteCheck) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teacher-code/check?code=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          valid?: boolean;
          available?: boolean | null;
          reason?: string;
        };

        if (data.available === true) {
          setAsyncResult({ code: normalized, status: "available", message: "ব্যবহারযোগ্য (Available)" });
          onAvailabilityRef.current?.(true);
        } else if (data.available === false) {
          setAsyncResult({
            code: normalized,
            status: "taken",
            message: data.reason ?? "আগেই নেওয়া হয়েছে",
          });
          onAvailabilityRef.current?.(false);
        } else {
          setAsyncResult({
            code: normalized,
            status: "error",
            message: data.reason ?? "এই মুহূর্তে যাচাই করা যাচ্ছে না।",
          });
          onAvailabilityRef.current?.(null);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setAsyncResult({
            code: normalized,
            status: "error",
            message: "Code যাচাইয়ে Network সমস্যা হয়েছে।",
          });
          onAvailabilityRef.current?.(null);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [needsRemoteCheck, normalized]);

  let status: "idle" | "checking" | "available" | "taken" | "invalid" | "unchanged" | "error" =
    "idle";
  let message = "৪–১২টি English অক্ষর বা সংখ্যা (যেমন: RAHIM2026)";

  if (!normalized) {
    status = "idle";
  } else if (!isValidTeacherCode(normalized)) {
    status = "invalid";
    message = "৪–১২টি English অক্ষর বা সংখ্যা ব্যবহার করুন (কোনো স্পেস বা চিহ্ন নয়)।";
  } else if (currentNorm && normalized === currentNorm) {
    status = "unchanged";
    message = "বর্তমান Teacher Code";
  } else if (asyncResult && asyncResult.code === normalized) {
    status = asyncResult.status;
    message = asyncResult.message;
  } else {
    status = "checking";
    message = "যাচাই করা হচ্ছে...";
  }

  function handleChange(raw: string) {
    const next = normalizeTeacherCode(raw);
    onChange(next);
    if (!next) {
      onAvailabilityRef.current?.(null);
    } else if (!isValidTeacherCode(next)) {
      onAvailabilityRef.current?.(false);
    } else if (currentNorm && next === currentNorm) {
      onAvailabilityRef.current?.(true);
    } else {
      onAvailabilityRef.current?.(null);
    }
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        Teacher Code{" "}
        <span className="text-xs font-normal text-slate-500">
          (students use this to find your exams)
        </span>
      </label>
      <div className="relative">
        <input
          id={id}
          name="teacherCode"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          maxLength={12}
          disabled={disabled}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="e.g. RAHIM26"
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 font-mono text-base sm:text-sm uppercase tracking-wider text-slate-900 placeholder:normal-case placeholder:tracking-normal focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 disabled:bg-slate-100"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          {status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          {(status === "available" || status === "unchanged") && (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
          {(status === "taken" || status === "invalid") && <XCircle className="h-4 w-4 text-rose-600" />}
        </span>
      </div>
      <p
        className={`text-xs ${
          status === "available" || status === "unchanged"
            ? "text-emerald-700"
            : status === "taken" || status === "invalid"
              ? "text-rose-600"
              : "text-slate-500"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
