"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  disabled?: boolean;
  className?: string;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required = false,
  minLength,
  autoComplete,
  enterKeyHint,
  disabled = false,
  className = "",
}: PasswordInputProps) {
  const { lang } = useLang();
  const [visible, setVisible] = useState(false);

  const toggleLabel = visible
    ? pickText(lang, "Password লুকান", "Hide password")
    : pickText(lang, "Password দেখুন", "Show password");

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        enterKeyHint={enterKeyHint}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-11 w-full rounded-lg border border-slate-300 pl-3 pr-11 py-2.5 text-base sm:text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 ${className}`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVisible((prev) => !prev)}
        aria-label={toggleLabel}
        title={toggleLabel}
        className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
