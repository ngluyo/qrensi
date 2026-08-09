/**
 * State machine jam kerja (blueprint §5.3 v2).
 * Murni (tanpa I/O) supaya mudah diuji. Waktu dibandingkan dalam menit-sejak-tengah-malam
 * pada zona waktu instansi (WITA); pemanggil bertanggung jawab mengonversi ke waktu lokal.
 */

export type JenisSesi = "masuk" | "istirahat" | "pulang";

export type StatusPresensi =
  | "tepat_waktu"
  | "terlambat"
  | "pulang_cepat"
  | "tidak_hadir"
  | "tidak_ada_di_kantor"
  | "ditolak_di_luar_jendela";

export interface SesiConfig {
  jenis_sesi: JenisSesi;
  jam_buka: string; // "HH:MM"
  jam_tutup: string;
  jam_batas_akhir?: string | null; // sesi masuk
  jam_wajar_akhir?: string | null; // sesi pulang
  mode_sebelum_jendela?: "blokir" | "izinkan_dengan_status";
  mode_setelah_jendela?: "blokir" | "izinkan_dengan_status";
}

export interface EvalResult {
  diterima: boolean;
  status: StatusPresensi;
  menit_keterlambatan: number;
  alasan?: string;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Evaluasi sebuah percobaan scan pada waktu `nowMinutes` (menit-sejak-tengah-malam)
 * terhadap konfigurasi sesi. Tidak menentukan `tidak_hadir`/`tidak_ada_di_kantor`
 * (itu ditetapkan job penutupan sesi, bukan saat scan).
 */
export function evaluasiScan(sesi: SesiConfig, nowMinutes: number): EvalResult {
  const buka = toMinutes(sesi.jam_buka);
  const tutup = toMinutes(sesi.jam_tutup);

  if (sesi.jenis_sesi === "masuk") {
    const batas = sesi.jam_batas_akhir ? toMinutes(sesi.jam_batas_akhir) : tutup;
    if (nowMinutes < buka)
      return { diterima: false, status: "ditolak_di_luar_jendela", menit_keterlambatan: 0, alasan: "sebelum_jam_buka" };
    if (nowMinutes <= tutup)
      return { diterima: true, status: "tepat_waktu", menit_keterlambatan: 0 };
    if (nowMinutes <= batas)
      return { diterima: true, status: "terlambat", menit_keterlambatan: nowMinutes - tutup };
    return { diterima: false, status: "ditolak_di_luar_jendela", menit_keterlambatan: 0, alasan: "lewat_batas_akhir" };
  }

  if (sesi.jenis_sesi === "istirahat") {
    if (nowMinutes < buka || nowMinutes > tutup)
      return { diterima: false, status: "ditolak_di_luar_jendela", menit_keterlambatan: 0, alasan: "di_luar_jendela" };
    return { diterima: true, status: "tepat_waktu", menit_keterlambatan: 0 };
  }

  // pulang
  if (nowMinutes < buka)
    return { diterima: true, status: "pulang_cepat", menit_keterlambatan: 0 };
  if (nowMinutes <= tutup)
    return { diterima: true, status: "tepat_waktu", menit_keterlambatan: 0 };
  return { diterima: false, status: "ditolak_di_luar_jendela", menit_keterlambatan: 0, alasan: "setelah_jam_tutup" };
}
