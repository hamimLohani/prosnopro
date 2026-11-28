"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/components/language-provider";
import {
  findAcademicOptionLabel,
  getAcademicOptionLabel,
  type AcademicOption,
} from "@/lib/academic-options";
import { pickText } from "@/lib/i18n";

interface SearchableOptionSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly AcademicOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage?: string;
  allowCustom?: boolean;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
}

export function SearchableOptionSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  allowCustom = true,
  required = false,
  className = "",
  buttonClassName = "h-11 sm:h-[42px]",
}: SearchableOptionSelectProps) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    searchInputRef.current?.focus();

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    return findAcademicOptionLabel(options, value, lang);
  }, [lang, options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.value.toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q) ||
        Boolean(o.labelBn && o.labelBn.toLowerCase().includes(q)),
    );
  }, [options, query]);

  const hasLegacyValue = Boolean(value && !options.some((o) => o.value === value));
  const trimmedQuery = query.trim();
  const hasExactMatch = Boolean(
    trimmedQuery &&
      options.some(
        (o) =>
          o.value.toLowerCase() === trimmedQuery.toLowerCase() ||
          o.label.toLowerCase() === trimmedQuery.toLowerCase() ||
          Boolean(o.labelBn && o.labelBn.toLowerCase() === trimmedQuery.toLowerCase()),
      ),
  );

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      )}

      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex ${buttonClassName} w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-left text-base sm:text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 cursor-pointer`}
      >
        <span className={`truncate ${selectedLabel ? "text-slate-900" : "text-slate-500"}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-200 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-sm focus:border-navy focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {!query.trim() && (
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                onClick={() => handleSelect("")}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm cursor-pointer ${
                  value === ""
                    ? "bg-navy/5 font-semibold text-navy"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{placeholder}</span>
                {value === "" && <Check className="h-4 w-4 shrink-0 text-navy" />}
              </button>
            )}

            {hasLegacyValue && !query.trim() && (
              <button
                type="button"
                role="option"
                aria-selected={true}
                onClick={() => handleSelect(value)}
                className="flex w-full items-center justify-between rounded-lg bg-navy/5 px-2.5 py-2 text-left text-sm font-semibold text-navy cursor-pointer"
              >
                <span className="truncate">{value}</span>
                <Check className="h-4 w-4 shrink-0 text-navy" />
              </button>
            )}

            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-center text-xs text-slate-500">
                {emptyMessage ?? pickText(lang, "কোনো মিল পাওয়া যায়নি।", "No matching option found.")}
              </p>
            ) : (
              filtered.map((opt) => {
                const selected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm cursor-pointer ${
                      selected
                        ? "bg-navy/5 font-semibold text-navy"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{getAcademicOptionLabel(opt, lang)}</span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-navy" />}
                  </button>
                );
              })
            )}

            {allowCustom && trimmedQuery && !hasExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(trimmedQuery)}
                className="mt-1 flex w-full items-center justify-between rounded-lg border border-dashed border-navy/30 bg-navy/5 px-2.5 py-2 text-left text-xs font-semibold text-navy hover:bg-navy/10 cursor-pointer"
              >
                <span className="truncate">
                  {pickText(lang, `+ কাস্টম: “${trimmedQuery}”`, `+ Custom: “${trimmedQuery}”`)}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
