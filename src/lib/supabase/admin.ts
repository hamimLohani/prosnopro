import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

export function isAdminClientConfigured(): boolean {
  const { configured } = getSupabaseEnv();
  return configured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * Server-only Supabase client with service_role privileges.
 * Never expose or import this from client components.
 */
export function createAdminClient() {
  const { url, configured } = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!configured || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
