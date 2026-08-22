"use server";

import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getDetailHari, type DetailHari } from "@/lib/presensi-data";

/** Ambil rincian presensi satu tanggal untuk pegawai yang sedang login. */
export async function detailHari(tanggal: string): Promise<DetailHari[]> {
  const user = await requireUser("/riwayat");
  if (!user.pegawaiId) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return [];

  const db = createAdminClient();
  const { data: peg } = await db
    .from("pegawai")
    .select("instansi(timezone)")
    .eq("id", user.pegawaiId)
    .maybeSingle();
  const tz = (peg?.instansi as unknown as { timezone: string })?.timezone ?? "Asia/Makassar";

  return getDetailHari(db, user.pegawaiId, tanggal, tz);
}
