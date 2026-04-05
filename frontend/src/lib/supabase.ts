import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

// Supabase config - uses env vars with fallback to hardcoded values
// The publishable key is meant to be public (like an anon key)
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://yicilggnzsqddybvhhvq.supabase.co";

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  "sb_publishable_fifEDV0xe_cafiy8izxrCQ_tAv-naQD";

/**
 * Get Supabase client. Lazy-init to avoid build-time crashes.
 */
export function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    return _supabase;
  } catch {
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}
