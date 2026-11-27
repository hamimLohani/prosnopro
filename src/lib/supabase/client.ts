import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";

export function createClient() {
  const { url, anonKey, configured } = getSupabaseEnv();
  if (!configured) {
    return null;
  }
  return createBrowserClient(url, anonKey);
}
