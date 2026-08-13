import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Web Push (server-only). VAPID dari env. */

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:admin@qrensi.local", pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Kirim notifikasi ke semua langganan milik daftar auth_user_id. */
export async function pushToAuthUsers(
  db: SupabaseClient,
  authUserIds: string[],
  payload: PushPayload,
): Promise<{ terkirim: number }> {
  if (!ensureConfigured() || authUserIds.length === 0) return { terkirim: 0 };

  const { data: subs } = await db
    .from("push_subscription")
    .select("id, endpoint, p256dh, auth")
    .in("auth_user_id", authUserIds);

  let terkirim = 0;
  const payloadStr = JSON.stringify(payload);

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
          payloadStr,
        );
        terkirim++;
      } catch (e: unknown) {
        // Langganan mati (410/404) → hapus.
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 410 || code === 404) {
          await db.from("push_subscription").delete().eq("id", s.id);
        }
      }
    }),
  );
  return { terkirim };
}

/** Ambil auth_user_id semua admin (unit + super) pada satu instansi. */
export async function adminAuthUserIds(db: SupabaseClient, instansiId: string): Promise<string[]> {
  const { data: unitAdmins } = await db
    .from("admin_unit_kerja")
    .select("auth_user_id, peran, unit_kerja!inner(instansi_id)")
    .eq("unit_kerja.instansi_id", instansiId);
  const { data: supers } = await db
    .from("admin_unit_kerja")
    .select("auth_user_id")
    .eq("peran", "super_admin");

  const ids = new Set<string>();
  for (const a of unitAdmins ?? []) ids.add(a.auth_user_id as string);
  for (const a of supers ?? []) ids.add(a.auth_user_id as string);
  return [...ids];
}
