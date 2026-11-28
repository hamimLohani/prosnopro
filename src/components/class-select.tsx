"use client";

import { useState } from "react";
import { CLASS_OPTIONS } from "@/lib/academic-options";

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
  placeholder = "Class / Level নির্বাচন করুন",
  customPlaceholder = "e.g. B.Sc. CSE 3rd Sem / MBA / Custom Class",
  className = "",
}: ClassSelectProps) {
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
        <option value="">{placeholder}</option>
        {CLASS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {allowCustom && <option value={CUSTOM_SENTINEL}>Custom / নিজে লিখুন...</option>}
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
