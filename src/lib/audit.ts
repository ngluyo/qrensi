import type { SupabaseClient } from "@supabase/supabase-js";
import type { SesiUser } from "@/lib/auth";

/**
 * Catat aksi admin yang sensitif (berdampak pada tunjangan/identitas).
 * Non-blocking: kegagalan audit tidak boleh menggagalkan aksi utama.
 */
export async function catatAudit(
  db: SupabaseClient,
  actor: SesiUser,
  aksi: string,
  target: { tabel?: string; id?: string | null; detail?: unknown } = {},
): Promise<void> {
  try {
    await db.from("audit_admin").insert({
      actor_auth_user_id: actor.authUserId,
      actor_nama: actor.nama ?? actor.email,
      aksi,
      target_tabel: target.tabel ?? null,
      target_id: target.id ?? null,
      detail: (target.detail ?? null) as object | null,
    });
  } catch {
    /* abaikan */
  }
}
