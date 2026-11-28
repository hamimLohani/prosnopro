export type AppLang = "bn" | "en";

export const LANG_COOKIE_NAME = "prosnopro_lang";

export function normalizeLang(raw: string | undefined | null): AppLang {
  return raw === "en" ? "en" : "bn";
}

export function pickText(lang: AppLang, bn: string, en: string): string {
  return lang === "en" ? en : bn;
}
