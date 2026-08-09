import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk komponen Client (browser).
 * Hanya memakai anon key — aman diekspos ke browser (dibatasi RLS).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
