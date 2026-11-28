import type { AppLang } from "./i18n.ts";
import type { AttemptStatus, EntryEvent, ExamMedium, ExamStatus } from "./types.ts";

const BN_OPTION_LABELS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ"] as const;

export function optionLabel(index: number, medium: ExamMedium): string {
  if (medium === "bn") {
    return BN_OPTION_LABELS[index] ?? String(index + 1);
  }
  return String.fromCharCode(65 + index);
}

export function formatAttemptStatus(status: AttemptStatus, lang: AppLang): string {
  switch (status) {
    case "in_progress":
      return lang === "en" ? "In Progress" : "চলমান";
    case "submitted":
      return lang === "en" ? "Submitted" : "জমা হয়েছে";
    case "auto_submitted":
      return lang === "en" ? "Auto Submitted" : "স্বয়ংক্রিয়ভাবে জমা";
  }
}

export function formatExamStatus(status: ExamStatus, lang: AppLang): string {
  switch (status) {
    case "published":
      return lang === "en" ? "Published" : "প্রকাশিত (Live)";
    case "closed":
      return lang === "en" ? "Closed" : "বন্ধ (Closed)";
    case "draft":
      return lang === "en" ? "Draft" : "খসড়া (Draft)";
  }
}

export function formatEntryEventType(
  eventType: EntryEvent["event_type"],
  lang: AppLang,
): string {
  switch (eventType) {
    case "joined":
      return lang === "en" ? "Joined" : "জয়েন করেছে";
    case "resumed":
      return lang === "en" ? "Resumed" : "পুনরায় শুরু";
    case "second_device":
      return lang === "en" ? "Second Device" : "দ্বিতীয় ডিভাইস";
    case "new_tab":
      return lang === "en" ? "New Tab" : "নতুন ট্যাব";
  }
}
