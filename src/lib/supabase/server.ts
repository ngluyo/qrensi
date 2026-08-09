import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client untuk Server Components / Route Handlers.
 * Memakai anon key + sesi user dari cookie (tunduk RLS).
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Dipanggil dari Server Component — abaikan; refresh sesi ditangani middleware.
          }
        },
      },
    },
  );
}

/**
 * Client service_role — BYPASS RLS. HANYA untuk kode server tepercaya
 * (API route presensi/verify, cron, dsb). JANGAN diimpor ke client.
 */
export function createAdminClient() {
  const { createClient: createSbClient } =
    require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
