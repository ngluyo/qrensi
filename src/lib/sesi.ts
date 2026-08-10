import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluasiScan, type SesiConfig, type EvalResult } from "@/lib/jam-kerja";

/**
 * Resolusi sesi absensi (server-only). Token QR membuktikan kedekatan fisik ke
 * kiosk; SESI yang dicatat ditentukan per-pegawai dari pola-nya + waktu WITA saat
 * scan (blueprint §5.3). Dengan begitu 1 kiosk melayani semua pola.
 */

export interface WaktuInstansi {
  hari: number; // 1=Minggu..7=Sabtu
  nowMinutes: number; // menit sejak tengah malam (zona instansi)
  tanggal: string; // yyyy-MM-dd (zona instansi)
}

export function waktuInstansi(tz: string, now = new Date()): WaktuInstansi {
  const z = toZonedTime(now, tz);
  return {
    hari: z.getDay() + 1, // JS 0=Min..6=Sab -> 1..7
    nowMinutes: z.getHours() * 60 + z.getMinutes(),
    tanggal: format(z, "yyyy-MM-dd"),
  };
}

export interface JamKerjaRow extends SesiConfig {
  id: string;
  instansi_id: string;
}

/**
 * Cari sesi jam_kerja yang jendelanya relevan sekarang untuk sebuah pola.
 * Mengembalikan sesi + hasil evaluasi. Prioritas: sesi yang `diterima`;
 * jika tidak ada, sesi terdekat yang sedang/lewat jendela (untuk pesan jelas).
 */
export async function cariSesiTerbukaPola(
  db: SupabaseClient,
  polaId: string,
  w: WaktuInstansi,
): Promise<{ sesi: JamKerjaRow; eval: EvalResult } | null> {
  const { data } = await db
    .from("jam_kerja_sesi")
    .select("id, instansi_id, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, jam_wajar_akhir, mode_sebelum_jendela, mode_setelah_jendela")
    .eq("pola_hari_kerja_id", polaId)
    .eq("hari", w.hari)
    .eq("aktif", true)
    .order("urutan");

  const rows = (data ?? []) as unknown as JamKerjaRow[];
  let fallback: { sesi: JamKerjaRow; eval: EvalResult } | null = null;

  for (const s of rows) {
    const ev = evaluasiScan(s, w.nowMinutes);
    if (ev.diterima) return { sesi: s, eval: ev };
    // Simpan sesi 'pulang' yang sudah lewat / masuk lewat batas sebagai konteks.
    if (!fallback) fallback = { sesi: s, eval: ev };
  }
  return fallback;
}

/** Cari sesi terbuka lintas SEMUA pola instansi (untuk kiosk generate token). */
export async function adaSesiTerbukaInstansi(
  db: SupabaseClient,
  instansiId: string,
  w: WaktuInstansi,
): Promise<{ jamKerjaSesiId: string } | null> {
  const { data: pola } = await db
    .from("pola_hari_kerja")
    .select("id")
    .eq("instansi_id", instansiId);
  for (const p of pola ?? []) {
    const hit = await cariSesiTerbukaPola(db, p.id as string, w);
    if (hit && hit.eval.diterima) return { jamKerjaSesiId: hit.sesi.id };
  }
  return null;
}

/** Upsert sesi_absensi_harian (unik per jam_kerja_sesi + tanggal). Return id. */
export async function pastikanSesiHarian(
  db: SupabaseClient,
  jamKerjaSesiId: string,
  instansiId: string,
  tanggal: string,
): Promise<string> {
  const { data: existing } = await db
    .from("sesi_absensi_harian")
    .select("id")
    .eq("jam_kerja_sesi_id", jamKerjaSesiId)
    .eq("tanggal", tanggal)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: inserted, error } = await db
    .from("sesi_absensi_harian")
    .insert({
      jam_kerja_sesi_id: jamKerjaSesiId,
      instansi_id: instansiId,
      tanggal,
      status: "dibuka",
      dibuka_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    // Race: baris sudah dibuat proses lain -> ambil ulang.
    const { data: retry } = await db
      .from("sesi_absensi_harian")
      .select("id")
      .eq("jam_kerja_sesi_id", jamKerjaSesiId)
      .eq("tanggal", tanggal)
      .single();
    return retry!.id as string;
  }
  return inserted.id as string;
}
