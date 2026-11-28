"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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

interface SelectableEntry {
  key: string;
  value: string;
  label: string;
  isCustom?: boolean;
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
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [showInvalid, setShowInvalid] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const isInvalid = showInvalid && !value;

  useEffect(() => {
    if (!open) return;

    searchInputRef.current?.focus();

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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

  const entries = useMemo<SelectableEntry[]>(() => {
    const list: SelectableEntry[] = [];
    if (!trimmedQuery) {
      list.push({ key: "__clear__", value: "", label: placeholder });
      if (hasLegacyValue) {
        list.push({ key: `legacy:${value}`, value, label: value });
      }
    }
    for (const opt of filtered) {
      list.push({
        key: opt.value,
        value: opt.value,
        label: getAcademicOptionLabel(opt, lang),
      });
    }
    if (allowCustom && trimmedQuery && !hasExactMatch) {
      list.push({
        key: "__custom__",
        value: trimmedQuery,
        label: pickText(lang, `+ কাস্টম: “${trimmedQuery}”`, `+ Custom: “${trimmedQuery}”`),
        isCustom: true,
      });
    }
    return list;
  }, [allowCustom, filtered, hasExactMatch, hasLegacyValue, lang, placeholder, trimmedQuery, value]);

  const commitSelection = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
      setShowInvalid(false);
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
    },
    [onChange],
  );

  function toggleDropdown() {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 260 && rect.top > spaceBelow);
    }
    setOpen((v) => !v);
    setActiveIndex(-1);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (entries.length === 0 ? -1 : (prev + 1) % entries.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        entries.length === 0 ? -1 : prev <= 0 ? entries.length - 1 : prev - 1,
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const chosen =
        activeIndex >= 0 && activeIndex < entries.length ? entries[activeIndex] : entries[0];
      if (chosen) {
        commitSelection(chosen.value);
        triggerRef.current?.focus();
      }
    }
  }

  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

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
          onInvalid={() => setShowInvalid(true)}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      )}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        data-invalid={isInvalid || undefined}
        onClick={toggleDropdown}
        className={`flex ${buttonClassName} w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-base sm:text-sm focus:outline-none focus:ring-2 cursor-pointer ${
          isInvalid
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
            : "border-slate-300 focus:border-navy focus:ring-navy/15"
        }`}
      >
        <span className={`truncate ${selectedLabel ? "text-slate-900" : "text-slate-500"}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute left-0 right-0 z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="border-b border-slate-200 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-3 sm:top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
                value={query}
                onKeyDown={handleSearchKeyDown}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="h-10 sm:h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-base sm:text-sm focus:border-navy focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
            {entries.length === 0 ? (
              <p className="px-3 py-2 text-center text-xs text-slate-500">
                {emptyMessage ?? pickText(lang, "কোনো মিল পাওয়া যায়নি।", "No matching option found.")}
              </p>
            ) : (
              entries.map((entry, idx) => {
                const selected = !entry.isCustom && value === entry.value;
                const active = idx === activeIndex;
                return (
                  <button
                    key={entry.key}
                    id={`${listboxId}-opt-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => commitSelection(entry.value)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex min-h-[40px] sm:min-h-[34px] w-full items-center justify-between rounded-lg px-2.5 py-2 sm:py-1.5 text-left text-sm cursor-pointer ${
                      entry.isCustom
                        ? `mt-1 border border-dashed border-navy/30 text-xs font-semibold text-navy ${
                            active ? "bg-navy/10" : "bg-navy/5 hover:bg-navy/10"
                          }`
                        : selected
                          ? "bg-navy/10 font-semibold text-navy"
                          : active
                            ? "bg-slate-100 text-slate-900"
                            : entry.value === ""
                              ? "text-slate-600 hover:bg-slate-50"
                              : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{entry.label}</span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-navy" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
