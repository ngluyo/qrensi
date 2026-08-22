import type { SupabaseClient } from "@supabase/supabase-js";
import { pastikanSesiHarian } from "@/lib/sesi";

/**
 * Menerapkan sanggahan/izin yang DISETUJUI ke data presensi (MASTERPLAN 4.1).
 *
 * Aturan:
 * - Jenis `izin|sakit|cuti|dinas_luar` → semua sesi pada tanggal itu diberi status
 *   sesuai jenisnya (menimpa `tidak_hadir`/`tidak_ada_di_kantor`), sehingga rekap
 *   & potongan tidak lagi menghitungnya sebagai alpa.
 * - Jenis `sanggahan` → tidak otomatis mengubah status (koreksi manual admin),
 *   hanya dicatat.
 * - Baris presensi yang sudah bernilai kehadiran nyata (`tepat_waktu`/`terlambat`)
 *   TIDAK ditimpa — kehadiran faktual lebih kuat daripada pengajuan.
 */
export async function terapkanIzinKePresensi(
  db: SupabaseClient,
  sanggahanId: string,
): Promise<{ diubah: number; dibuat: number }> {
  const { data: s } = await db
    .from("sanggahan")
    .select("id, pegawai_id, instansi_id, jenis, tanggal, status")
    .eq("id", sanggahanId)
    .maybeSingle();

  if (!s || s.status !== "disetujui") return { diubah: 0, dibuat: 0 };
  const jenis = s.jenis as string;
  if (!["izin", "sakit", "cuti", "dinas_luar"].includes(jenis)) return { diubah: 0, dibuat: 0 };

  const tanggal = s.tanggal as string;
  const pegawaiId = s.pegawai_id as string;

  // Pola kerja pegawai → sesi apa saja yang berlaku pada tanggal itu.
  const { data: peg } = await db
    .from("pegawai")
    .select("pola_hari_kerja_id, instansi_id")
    .eq("id", pegawaiId)
    .maybeSingle();
  if (!peg) return { diubah: 0, dibuat: 0 };

  // Hari (1=Minggu..7=Sabtu) dari tanggal.
  const hari = (new Date(tanggal + "T00:00:00").getDay() + 1) as number;

  const { data: sesiHari } = await db
    .from("jam_kerja_sesi")
    .select("id")
    .eq("pola_hari_kerja_id", peg.pola_hari_kerja_id)
    .eq("hari", hari)
    .eq("aktif", true);

  let diubah = 0;
  let dibuat = 0;

  for (const jk of sesiHari ?? []) {
    const sesiHarianId = await pastikanSesiHarian(
      db,
      jk.id as string,
      peg.instansi_id as string,
      tanggal,
    );

    const { data: ada } = await db
      .from("presensi")
      .select("id, status")
      .eq("sesi_absensi_harian_id", sesiHarianId)
      .eq("pegawai_id", pegawaiId)
      .maybeSingle();

    if (ada) {
      // Jangan timpa kehadiran faktual.
      if (ada.status === "tepat_waktu" || ada.status === "terlambat") continue;
      const { error } = await db
        .from("presensi")
        .update({ status: jenis, menit_keterlambatan: 0, sanggahan_id: sanggahanId })
        .eq("id", ada.id);
      if (!error) diubah++;
    } else {
      const { error } = await db.from("presensi").insert({
        sesi_absensi_harian_id: sesiHarianId,
        pegawai_id: pegawaiId,
        status: jenis,
        menit_keterlambatan: 0,
        sanggahan_id: sanggahanId,
      });
      if (!error) dibuat++;
    }
  }

  return { diubah, dibuat };
}
