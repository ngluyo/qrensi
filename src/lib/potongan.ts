/**
 * Perhitungan potongan tunjangan (blueprint §5.4).
 * Sistem hanya menghasilkan PERSENTASE + rekap menit, BUKAN nominal rupiah.
 */

export interface AturanPotongan {
  jenis: "terlambat" | "pulang_cepat" | "tidak_hadir";
  menit_dari: number;
  menit_sampai: number | null; // null = tak terhingga
  persen_potongan: number;
}

export interface BarisPresensi {
  status: string;
  menit_keterlambatan: number;
}

function cariAturan(
  aturan: AturanPotongan[],
  jenis: AturanPotongan["jenis"],
  menit: number,
): AturanPotongan | undefined {
  return aturan.find(
    (a) =>
      a.jenis === jenis &&
      menit >= a.menit_dari &&
      (a.menit_sampai === null || menit <= a.menit_sampai),
  );
}

export interface HasilPotongan {
  total_persen: number;
  total_menit_terlambat: number;
  rincian: { status: string; menit: number; persen: number }[];
}

export function hitungPotongan(
  presensi: BarisPresensi[],
  aturan: AturanPotongan[],
): HasilPotongan {
  let total_persen = 0;
  let total_menit_terlambat = 0;
  const rincian: HasilPotongan["rincian"] = [];

  for (const p of presensi) {
    let persen = 0;
    if (p.status === "terlambat") {
      total_menit_terlambat += p.menit_keterlambatan;
      persen = cariAturan(aturan, "terlambat", p.menit_keterlambatan)?.persen_potongan ?? 0;
    } else if (p.status === "pulang_cepat") {
      persen = cariAturan(aturan, "pulang_cepat", 0)?.persen_potongan ?? 0;
    } else if (p.status === "tidak_hadir") {
      persen = cariAturan(aturan, "tidak_hadir", 0)?.persen_potongan ?? 0;
    }
    if (persen > 0) rincian.push({ status: p.status, menit: p.menit_keterlambatan, persen });
    total_persen += persen;
  }

  return {
    total_persen: Math.round(total_persen * 100) / 100,
    total_menit_terlambat,
    rincian,
  };
}
