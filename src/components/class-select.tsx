"use client";

import { useState } from "react";
import { useLang } from "@/components/language-provider";
import { CLASS_OPTIONS } from "@/lib/academic-options";
import { pickText } from "@/lib/i18n";

interface ClassSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  allowCustom?: boolean;
  placeholder?: string;
  customPlaceholder?: string;
  className?: string;
}

const CUSTOM_SENTINEL = "__custom__";

export function ClassSelect({
  id,
  value,
  onChange,
  required = false,
  allowCustom = true,
  placeholder,
  customPlaceholder = "e.g. B.Sc. CSE 3rd Sem / MBA / Custom Class",
  className = "",
}: ClassSelectProps) {
  const { lang } = useLang();
  const resolvedPlaceholder =
    placeholder ?? pickText(lang, "Class / Level নির্বাচন করুন", "Select Class / Level");
  const isPreset = CLASS_OPTIONS.some((o) => o.value === value);
  const [customMode, setCustomMode] = useState(Boolean(value && !isPreset));
  const selectValue = customMode ? CUSTOM_SENTINEL : value;

  return (
    <div className={`space-y-2 ${className}`}>
      <select
        id={id}
        required={required && !customMode}
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM_SENTINEL) {
            setCustomMode(true);
            if (isPreset) onChange("");
          } else {
            setCustomMode(false);
            onChange(next);
          }
        }}
        className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
      >
        <option value="">{resolvedPlaceholder}</option>
        {CLASS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {allowCustom && (
          <option value={CUSTOM_SENTINEL}>
            {pickText(lang, "Custom / নিজে লিখুন...", "Custom (type your own)...")}
          </option>
        )}
      </select>

      {allowCustom && customMode && (
        <input
          type="text"
          required={required}
          maxLength={60}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={customPlaceholder}
          className="h-11 sm:h-[42px] w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
        />
      )}
    </div>
  );
}
