"use client";

import { useLang } from "@/components/language-provider";
import { SearchableOptionSelect } from "@/components/searchable-option-select";
import { SUBJECT_OPTIONS } from "@/lib/academic-options";
import { pickText } from "@/lib/i18n";

interface SearchableSubjectSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
}

export function SearchableSubjectSelect({
  id,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  allowCustom = true,
  required = false,
  className = "",
  buttonClassName,
}: SearchableSubjectSelectProps) {
  const { lang } = useLang();
  const resolvedPlaceholder =
    placeholder === "All Subjects"
      ? pickText(lang, "সব বিষয়", "All Subjects")
      : (placeholder ?? pickText(lang, "বিষয় নির্বাচন করুন", "Select Subject"));
  const resolvedSearchPlaceholder =
    !searchPlaceholder || searchPlaceholder === "Search subject..."
      ? pickText(lang, "বিষয় খুঁজুন...", "Search subject...")
      : searchPlaceholder;

  return (
    <SearchableOptionSelect
      id={id}
      value={value}
      onChange={onChange}
      options={SUBJECT_OPTIONS}
      placeholder={resolvedPlaceholder}
      searchPlaceholder={resolvedSearchPlaceholder}
      emptyMessage={pickText(
        lang,
        "কোনো মিল পাওয়া যায়নি।",
        "No matching preset subject found.",
      )}
      allowCustom={allowCustom}
      required={required}
      className={className}
      buttonClassName={buttonClassName}
    />
  );
}
