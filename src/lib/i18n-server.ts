import { cookies } from "next/headers";
import { LANG_COOKIE_NAME, normalizeLang, type AppLang } from "@/lib/i18n";

export async function getServerLang(): Promise<AppLang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE_NAME)?.value);
}
