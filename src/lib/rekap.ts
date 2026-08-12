import type { SupabaseClient } from "@supabase/supabase-js";
import { waktuInstansi } from "@/lib/sesi";
import { hitungPotongan, type AturanPotongan } from "@/lib/potongan";
import type { RekapRow } from "@/lib/google-sheets";

/**
 * Hitung rekap presensi bulan berjalan untuk seluruh pegawai satu instansi.
 * Dipakai bersama oleh ekspor Sheets & backup Drive (server-only).
 */
export async function computeRekapBulanan(
  db: SupabaseClient,
  instansiId: string,
): Promise<{ periode: string; rows: RekapRow[] }> {
  const { data: inst } = await db.from("instansi").select("timezone").eq("id", instansiId).single();
  const tz = inst?.timezone ?? "Asia/Makassar";
  const w = waktuInstansi(tz);
  const [y, m] = w.tanggal.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const last = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [{ data: pegawai }, { data: aturan }, { data: pres }] = await Promise.all([
    db.from("pegawai").select("id, nama, nip, unit_kerja(nama)").eq("instansi_id", instansiId).order("nama"),
    db.from("pengaturan_potongan").select("jenis, menit_dari, menit_sampai, persen_potongan").eq("instansi_id", instansiId),
    db
      .from("presensi")
      .select("pegawai_id, status, menit_keterlambatan, sesi_absensi_harian!inner(tanggal, instansi_id)")
      .eq("sesi_absensi_harian.instansi_id", instansiId)
      .gte("sesi_absensi_harian.tanggal", first)
      .lte("sesi_absensi_harian.tanggal", last),
  ]);

  const aturanList = (aturan ?? []) as AturanPotongan[];

  const byPeg = new Map<string, { status: string; menit: number; tanggal: string }[]>();
  for (const p of pres ?? []) {
    const tgl = (p.sesi_absensi_harian as unknown as { tanggal: string }).tanggal;
    const pid = p.pegawai_id as string;
    if (!byPeg.has(pid)) byPeg.set(pid, []);
    byPeg.get(pid)!.push({ status: p.status as string, menit: p.menit_keterlambatan as number, tanggal: tgl });
  }

  const rows: RekapRow[] = (pegawai ?? []).map((pg) => {
    const list = byPeg.get(pg.id as string) ?? [];
    const hadirHari = new Set(list.filter((r) => r.status === "tepat_waktu" || r.status === "terlambat").map((r) => r.tanggal));
    const pot = hitungPotongan(list.map((r) => ({ status: r.status, menit_keterlambatan: r.menit })), aturanList);
    return {
      nama: pg.nama as string,
      nip: (pg.nip as string) ?? "-",
      unit: (pg.unit_kerja as unknown as { nama: string } | null)?.nama ?? "-",
      hadir: hadirHari.size,
      terlambat: list.filter((r) => r.status === "terlambat").length,
      menitTerlambat: list.filter((r) => r.status === "terlambat").reduce((s, r) => s + (r.menit || 0), 0),
      tidakHadir: list.filter((r) => r.status === "tidak_hadir").length,
      tidakDiKantor: list.filter((r) => r.status === "tidak_ada_di_kantor").length,
      potonganPersen: pot.total_persen,
    };
  });

  return { periode: `${String(m).padStart(2, "0")}-${y}`, rows };
}

/** Ubah rekap ke CSV (untuk backup Drive). */
export function rekapToCsv(periode: string, rows: RekapRow[]): string {
  const header = ["Nama", "NIP", "Unit", "Hadir", "Terlambat", "MenitTelat", "TidakHadir", "TidakDiKantor", "PotonganPersen"];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    `Rekap Presensi,${periode}`,
    header.join(","),
    ...rows.map((r) => [r.nama, r.nip, r.unit, r.hadir, r.terlambat, r.menitTerlambat, r.tidakHadir, r.tidakDiKantor, r.potonganPersen].map(esc).join(",")),
  ];
  return lines.join("\n");
}
