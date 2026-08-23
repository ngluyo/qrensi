import type { SupabaseClient } from "@supabase/supabase-js";
import { waktuInstansi } from "@/lib/sesi";
import { hitungPotongan, type AturanPotongan } from "@/lib/potongan";
import type { RekapRow } from "@/lib/google-sheets";

/**
 * Perhitungan rekap presensi. Dipakai bersama oleh ekspor Sheets, backup Drive,
 * dan laporan cetak. Server-only.
 */

export interface Periode {
  dari: string; // yyyy-MM-dd
  sampai: string; // yyyy-MM-dd
  label: string; // mis. "08-2026" atau "01 Agu – 15 Agu 2026"
}

/** Periode bulan berjalan menurut zona waktu instansi. */
export function periodeBulanIni(tz: string): Periode {
  const w = waktuInstansi(tz);
  const [y, m] = w.tanggal.split("-").map(Number);
  return periodeBulan(y, m);
}

export function periodeBulan(tahun: number, bulan1: number): Periode {
  const mm = String(bulan1).padStart(2, "0");
  const akhir = new Date(tahun, bulan1, 0).getDate();
  return {
    dari: `${tahun}-${mm}-01`,
    sampai: `${tahun}-${mm}-${String(akhir).padStart(2, "0")}`,
    label: `${mm}-${tahun}`,
  };
}

/** Validasi & bentuk periode dari input bebas (filter laporan). */
export function periodeDari(dari?: string, sampai?: string, tz = "Asia/Makassar"): Periode {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (dari && sampai && re.test(dari) && re.test(sampai) && dari <= sampai) {
    return { dari, sampai, label: `${dari} s/d ${sampai}` };
  }
  return periodeBulanIni(tz);
}

export interface OpsiRekap {
  periode?: Periode;
  /** Batasi ke unit tertentu (null/undefined = semua unit dalam instansi). */
  unitKerjaIds?: string[] | null;
}

export async function computeRekapBulanan(
  db: SupabaseClient,
  instansiId: string,
  opsi: OpsiRekap = {},
): Promise<{ periode: string; rows: RekapRow[]; rentang: Periode }> {
  const { data: inst } = await db.from("instansi").select("timezone").eq("id", instansiId).single();
  const tz = inst?.timezone ?? "Asia/Makassar";
  const rentang = opsi.periode ?? periodeBulanIni(tz);

  let pegQ = db
    .from("pegawai")
    .select("id, nama, nip, unit_kerja(nama)")
    .eq("instansi_id", instansiId)
    .order("nama");
  if (opsi.unitKerjaIds) {
    pegQ = pegQ.in("unit_kerja_id", opsi.unitKerjaIds.length ? opsi.unitKerjaIds : ["-"]);
  }

  const [{ data: pegawai }, { data: aturan }] = await Promise.all([
    pegQ,
    db
      .from("pengaturan_potongan")
      .select("jenis, menit_dari, menit_sampai, persen_potongan")
      .eq("instansi_id", instansiId),
  ]);

  const pegIds = (pegawai ?? []).map((p) => p.id as string);
  const { data: pres } = pegIds.length
    ? await db
        .from("presensi")
        .select("pegawai_id, status, menit_keterlambatan, sesi_absensi_harian!inner(tanggal)")
        .in("pegawai_id", pegIds)
        .gte("sesi_absensi_harian.tanggal", rentang.dari)
        .lte("sesi_absensi_harian.tanggal", rentang.sampai)
    : { data: [] };

  const aturanList = (aturan ?? []) as AturanPotongan[];

  const byPeg = new Map<string, { status: string; menit: number; tanggal: string }[]>();
  for (const p of pres ?? []) {
    const tgl = (p.sesi_absensi_harian as unknown as { tanggal: string }).tanggal;
    const pid = p.pegawai_id as string;
    if (!byPeg.has(pid)) byPeg.set(pid, []);
    byPeg.get(pid)!.push({
      status: p.status as string,
      menit: (p.menit_keterlambatan as number) ?? 0,
      tanggal: tgl,
    });
  }

  const rows: RekapRow[] = (pegawai ?? []).map((pg) => {
    const list = byPeg.get(pg.id as string) ?? [];
    const hadirHari = new Set(
      list.filter((r) => r.status === "tepat_waktu" || r.status === "terlambat").map((r) => r.tanggal),
    );
    const pot = hitungPotongan(
      list.map((r) => ({ status: r.status, menit_keterlambatan: r.menit })),
      aturanList,
    );
    return {
      nama: pg.nama as string,
      nip: (pg.nip as string) ?? "-",
      unit: (pg.unit_kerja as unknown as { nama: string } | null)?.nama ?? "-",
      hadir: hadirHari.size,
      terlambat: list.filter((r) => r.status === "terlambat").length,
      menitTerlambat: list
        .filter((r) => r.status === "terlambat")
        .reduce((s, r) => s + (r.menit || 0), 0),
      tidakHadir: list.filter((r) => r.status === "tidak_hadir").length,
      tidakDiKantor: list.filter((r) => r.status === "tidak_ada_di_kantor").length,
      potonganPersen: pot.total_persen,
    };
  });

  return { periode: rentang.label, rows, rentang };
}

/** Ubah rekap ke CSV (untuk backup Drive). */
export function rekapToCsv(periode: string, rows: RekapRow[]): string {
  const header = [
    "Nama", "NIP", "Unit", "Hadir", "Terlambat", "MenitTelat",
    "TidakHadir", "TidakDiKantor", "PotonganPersen",
  ];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    `Rekap Presensi,${periode}`,
    header.join(","),
    ...rows.map((r) =>
      [r.nama, r.nip, r.unit, r.hadir, r.terlambat, r.menitTerlambat, r.tidakHadir, r.tidakDiKantor, r.potonganPersen]
        .map(esc)
        .join(","),
    ),
  ];
  return lines.join("\n");
}
