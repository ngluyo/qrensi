import type { SupabaseClient } from "@supabase/supabase-js";
import { toMinutes } from "@/lib/jam-kerja";
import { waktuInstansi, pastikanSesiHarian } from "@/lib/sesi";

/**
 * Finalisasi sesi harian yang jendelanya sudah tertutup (blueprint §5.3):
 * - sesi 'masuk' lewat batas akhir  -> pegawai tanpa presensi = 'tidak_hadir'
 * - sesi 'istirahat'/'pulang' lewat jam tutup -> pegawai yang PAGINYA hadir
 *   tapi tak absen = 'tidak_ada_di_kantor' (yang paginya alpa tidak ditandai lagi)
 *
 * Idempoten: hanya menyisipkan baris presensi yang belum ada (unique sesi+pegawai).
 */
export async function tutupSesiHarian(db: SupabaseClient): Promise<{ ditutup: number; ditandai: number }> {
  let ditutup = 0;
  let ditandai = 0;

  const { data: instansiList } = await db.from("instansi").select("id, timezone").eq("aktif", true);

  for (const inst of instansiList ?? []) {
    const w = waktuInstansi(inst.timezone ?? "Asia/Makassar");

    // Semua jam_kerja_sesi aktif untuk hari ini di instansi ini.
    const { data: sesiHari } = await db
      .from("jam_kerja_sesi")
      .select("id, pola_hari_kerja_id, jenis_sesi, jam_tutup, jam_batas_akhir")
      .eq("instansi_id", inst.id)
      .eq("hari", w.hari)
      .eq("aktif", true);

    // Cache: pegawai_ids yang hadir pagi per pola (untuk aturan istirahat/pulang).
    const hadirPagiPerPola = new Map<string, Set<string>>();

    // Proses 'masuk' dulu agar cache terisi.
    const urut = [...(sesiHari ?? [])].sort((a) => (a.jenis_sesi === "masuk" ? -1 : 1));

    for (const s of urut) {
      const closeAt =
        s.jenis_sesi === "masuk"
          ? toMinutes(s.jam_batas_akhir ?? s.jam_tutup)
          : toMinutes(s.jam_tutup);
      if (w.nowMinutes <= closeAt) continue; // belum tutup

      const sesiHarianId = await pastikanSesiHarian(db, s.id, inst.id, w.tanggal);
      await db
        .from("sesi_absensi_harian")
        .update({ status: "ditutup", ditutup_at: new Date().toISOString() })
        .eq("id", sesiHarianId);
      ditutup++;

      // Pegawai aktif pada pola ini.
      const { data: pegawai } = await db
        .from("pegawai")
        .select("id")
        .eq("pola_hari_kerja_id", s.pola_hari_kerja_id)
        .eq("status_kepegawaian", "aktif");
      const semuaPegawai = new Set((pegawai ?? []).map((p) => p.id as string));

      // Pegawai yang sudah punya presensi untuk sesi ini.
      const { data: sudah } = await db
        .from("presensi")
        .select("pegawai_id, status")
        .eq("sesi_absensi_harian_id", sesiHarianId);
      const sudahAbsen = new Set((sudah ?? []).map((p) => p.pegawai_id as string));

      if (s.jenis_sesi === "masuk") {
        // Simpan yang hadir pagi (untuk aturan sesi lain).
        const hadir = new Set(
          (sudah ?? [])
            .filter((p) => p.status === "tepat_waktu" || p.status === "terlambat")
            .map((p) => p.pegawai_id as string),
        );
        hadirPagiPerPola.set(s.pola_hari_kerja_id, hadir);
      }

      const kurang = [...semuaPegawai].filter((id) => !sudahAbsen.has(id));
      if (kurang.length === 0) continue;

      let rows: { sesi_absensi_harian_id: string; pegawai_id: string; status: string }[] = [];
      if (s.jenis_sesi === "masuk") {
        rows = kurang.map((id) => ({ sesi_absensi_harian_id: sesiHarianId, pegawai_id: id, status: "tidak_hadir" }));
      } else {
        // Hanya yang hadir pagi -> tidak_ada_di_kantor. Yang alpa pagi dilewati.
        const hadirPagi = hadirPagiPerPola.get(s.pola_hari_kerja_id);
        const target = hadirPagi ? kurang.filter((id) => hadirPagi.has(id)) : [];
        rows = target.map((id) => ({
          sesi_absensi_harian_id: sesiHarianId,
          pegawai_id: id,
          status: "tidak_ada_di_kantor",
        }));
      }

      if (rows.length > 0) {
        const { error } = await db.from("presensi").insert(rows);
        if (!error) ditandai += rows.length;
      }
    }
  }

  return { ditutup, ditandai };
}
