import type { SupabaseClient } from "@supabase/supabase-js";
import { toMinutes } from "@/lib/jam-kerja";
import { waktuInstansi } from "@/lib/sesi";
import type { StatusKey } from "@/lib/status-presensi";

export type SesiState = "selesai" | "aktif" | "menunggu" | "terlewat";

export interface SesiHariIni {
  jenis: "masuk" | "istirahat" | "pulang";
  nama: string;
  jam: string; // "07:15 – 07:45"
  state: SesiState;
  status?: StatusKey; // jika sudah ada presensi
  menit?: number;
}

const NAMA: Record<string, string> = { masuk: "Masuk", istirahat: "Istirahat", pulang: "Pulang" };

function hhmm(t: string) {
  return t.slice(0, 5);
}

/** Sesi hari ini untuk seorang pegawai + status live-nya. */
export async function getSesiHariIni(
  db: SupabaseClient,
  pegawai: { id: string; pola_hari_kerja_id: string; instansi_id: string },
  tz: string,
): Promise<{ sesi: SesiHariIni[]; tanggal: string }> {
  const w = waktuInstansi(tz);

  const { data: rows } = await db
    .from("jam_kerja_sesi")
    .select("id, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan")
    .eq("pola_hari_kerja_id", pegawai.pola_hari_kerja_id)
    .eq("hari", w.hari)
    .eq("aktif", true)
    .order("urutan");

  // Presensi pegawai hari ini (join sesi_absensi_harian utk tanggal + jam_kerja_sesi).
  const { data: pres } = await db
    .from("presensi")
    .select("status, menit_keterlambatan, sesi_absensi_harian!inner(jam_kerja_sesi_id, tanggal)")
    .eq("pegawai_id", pegawai.id)
    .eq("sesi_absensi_harian.tanggal", w.tanggal);

  const byJk = new Map<string, { status: StatusKey; menit: number }>();
  for (const p of pres ?? []) {
    const jk = (p.sesi_absensi_harian as unknown as { jam_kerja_sesi_id: string }).jam_kerja_sesi_id;
    byJk.set(jk, { status: p.status as StatusKey, menit: p.menit_keterlambatan as number });
  }

  const sesi: SesiHariIni[] = (rows ?? []).map((r) => {
    const buka = toMinutes(r.jam_buka);
    const tutup = toMinutes(r.jam_tutup);
    const close = r.jenis_sesi === "masuk" ? toMinutes(r.jam_batas_akhir ?? r.jam_tutup) : tutup;
    const done = byJk.get(r.id);

    let state: SesiState;
    if (done) state = "selesai";
    else if (w.nowMinutes < buka) state = "menunggu";
    else if (w.nowMinutes <= close) state = "aktif";
    else state = "terlewat";

    return {
      jenis: r.jenis_sesi as SesiHariIni["jenis"],
      nama: NAMA[r.jenis_sesi] ?? r.jenis_sesi,
      jam: `${hhmm(r.jam_buka)} – ${hhmm(r.jam_tutup)}`,
      state,
      status: done?.status,
      menit: done?.menit,
    };
  });

  return { sesi, tanggal: w.tanggal };
}

export interface RekapBulan {
  hadir: number; // hari dengan minimal 1 presensi hadir (tepat_waktu/terlambat)
  terlambat: number; // jumlah kejadian terlambat
  menitTerlambat: number;
  tidakHadir: number;
  tidakDiKantor: number;
  perHari: Record<string, StatusKey[]>; // tanggal -> daftar status hari itu
}

/** Rekap satu bulan (untuk beranda mini & kalender riwayat). */
export async function getRekapBulan(
  db: SupabaseClient,
  pegawaiId: string,
  tz: string,
  year: number,
  monthIndex0: number, // 0=Jan
): Promise<RekapBulan> {
  const first = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const last = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: pres } = await db
    .from("presensi")
    .select("status, menit_keterlambatan, sesi_absensi_harian!inner(tanggal)")
    .eq("pegawai_id", pegawaiId)
    .gte("sesi_absensi_harian.tanggal", first)
    .lte("sesi_absensi_harian.tanggal", last);

  const perHari: Record<string, StatusKey[]> = {};
  const hadirHari = new Set<string>();
  let terlambat = 0,
    menitTerlambat = 0,
    tidakHadir = 0,
    tidakDiKantor = 0;

  for (const p of pres ?? []) {
    const tgl = (p.sesi_absensi_harian as unknown as { tanggal: string }).tanggal;
    const st = p.status as StatusKey;
    (perHari[tgl] ??= []).push(st);
    if (st === "tepat_waktu" || st === "terlambat") hadirHari.add(tgl);
    if (st === "terlambat") {
      terlambat++;
      menitTerlambat += (p.menit_keterlambatan as number) ?? 0;
    }
    if (st === "tidak_hadir") tidakHadir++;
    if (st === "tidak_ada_di_kantor") tidakDiKantor++;
  }

  return { hadir: hadirHari.size, terlambat, menitTerlambat, tidakHadir, tidakDiKantor, perHari };
}
