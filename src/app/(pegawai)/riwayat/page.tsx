import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getRekapBulan } from "@/lib/presensi-data";
import { waktuInstansi } from "@/lib/sesi";
import { hitungPotongan, type AturanPotongan } from "@/lib/potongan";
import { RiwayatClient } from "./riwayat-client";

export default async function RiwayatPage() {
  const user = await requireUser();
  const db = createAdminClient();

  const { data: pegawai } = await db
    .from("pegawai")
    .select("id, instansi_id, instansi(timezone)")
    .eq("auth_user_id", user.authUserId)
    .maybeSingle();

  if (!pegawai) {
    return <RiwayatClient year={2026} month={0} perHari={{}} summary={null} potonganPersen={0} />;
  }

  const tz = (pegawai.instansi as unknown as { timezone: string })?.timezone ?? "Asia/Makassar";
  const w = waktuInstansi(tz);
  const [y, m] = w.tanggal.split("-").map(Number);
  const rekap = await getRekapBulan(db, pegawai.id, tz, y, m - 1);

  // Potongan bulan berjalan.
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const last = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const [{ data: pres }, { data: aturan }] = await Promise.all([
    db
      .from("presensi")
      .select("status, menit_keterlambatan, sesi_absensi_harian!inner(tanggal)")
      .eq("pegawai_id", pegawai.id)
      .gte("sesi_absensi_harian.tanggal", first)
      .lte("sesi_absensi_harian.tanggal", last),
    db.from("pengaturan_potongan").select("jenis, menit_dari, menit_sampai, persen_potongan").eq("instansi_id", pegawai.instansi_id),
  ]);
  const potongan = hitungPotongan(
    (pres ?? []).map((p) => ({ status: p.status as string, menit_keterlambatan: p.menit_keterlambatan as number })),
    (aturan ?? []) as AturanPotongan[],
  );

  return (
    <RiwayatClient
      year={y}
      month={m - 1}
      perHari={rekap.perHari}
      summary={{
        hadir: rekap.hadir,
        terlambat: rekap.terlambat,
        tidakHadir: rekap.tidakHadir,
        tidakDiKantor: rekap.tidakDiKantor,
      }}
      potonganPersen={potongan.total_persen}
    />
  );
}
