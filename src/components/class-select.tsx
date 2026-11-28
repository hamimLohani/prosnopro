"use client";

import { useLang } from "@/components/language-provider";
import { SearchableOptionSelect } from "@/components/searchable-option-select";
import { CLASS_OPTIONS } from "@/lib/academic-options";
import { pickText } from "@/lib/i18n";

interface ClassSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  allowCustom?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  buttonClassName?: string;
}

export function ClassSelect({
  id,
  value,
  onChange,
  required = false,
  allowCustom = true,
  placeholder,
  searchPlaceholder,
  className = "",
  buttonClassName,
}: ClassSelectProps) {
  const { lang } = useLang();
  const resolvedPlaceholder =
    placeholder === "All Classes"
      ? pickText(lang, "সব Class", "All Classes")
      : (placeholder ?? pickText(lang, "Class / Level নির্বাচন করুন", "Select Class / Level"));
  const resolvedSearchPlaceholder =
    !searchPlaceholder || searchPlaceholder === "Search class..."
      ? allowCustom
        ? pickText(lang, "Class খুঁজুন বা লিখুন...", "Search or type custom class...")
        : pickText(lang, "Class খুঁজুন...", "Search class...")
      : searchPlaceholder;

  return (
    <SearchableOptionSelect
      id={id}
      value={value}
      onChange={onChange}
      options={CLASS_OPTIONS}
      placeholder={resolvedPlaceholder}
      searchPlaceholder={resolvedSearchPlaceholder}
      emptyMessage={pickText(
        lang,
        "কোনো মিল পাওয়া যায়নি।",
        "No matching preset class found.",
      )}
      allowCustom={allowCustom}
      required={required}
      className={className}
      buttonClassName={buttonClassName}
    />
  );
}
