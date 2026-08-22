import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Foto profil disimpan di bucket privat `avatar` → diakses lewat signed URL
 * berumur pendek. Terpisah dari data biometrik enrollment (lihat migrasi 0010).
 */
const TTL_DETIK = 60 * 60; // 1 jam

export async function signedAvatar(
  db: SupabaseClient,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await db.storage.from("avatar").createSignedUrl(path, TTL_DETIK);
  return data?.signedUrl ?? null;
}

/** Signed URL untuk banyak path sekaligus (daftar pegawai). */
export async function signedAvatars(
  db: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unik = [...new Set(paths.filter(Boolean) as string[])];
  const hasil = new Map<string, string>();
  if (unik.length === 0) return hasil;

  const { data } = await db.storage.from("avatar").createSignedUrls(unik, TTL_DETIK);
  for (const d of data ?? []) {
    if (d.path && d.signedUrl) hasil.set(d.path, d.signedUrl);
  }
  return hasil;
}
