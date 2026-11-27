export interface SupabaseEnv {
  url: string;
  anonKey: string;
  configured: boolean;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
  };
}

export function getSiteUrl(fallbackOrigin?: string): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }
  return (fallbackOrigin ?? "http://localhost:3000").replace(/\/$/, "");
}
