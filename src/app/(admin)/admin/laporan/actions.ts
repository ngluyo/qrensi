"use server";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { waktuInstansi } from "@/lib/sesi";
import { hitungPotongan, type AturanPotongan } from "@/lib/potongan";
import { exportRekapBulanan, type RekapRow } from "@/lib/google-sheets";

export interface EksporState {
  ok: boolean;
  message?: string;
  url?: string;
  baris?: number;
}

export async function eksporSheets(_prev: EksporState, _formData: FormData): Promise<EksporState> {
  const user = await requireAdmin();
  const spreadsheetId = process.env.GOOGLE_SHEETS_REKAP_ID;
  if (!spreadsheetId) return { ok: false, message: "GOOGLE_SHEETS_REKAP_ID belum diset." };

  const db = createAdminClient();

  const { data: inst } = await db.from("instansi").select("timezone").eq("id", user.instansiId).single();
  const tz = inst?.timezone ?? "Asia/Makassar";
  const w = waktuInstansi(tz);
  const [y, m] = w.tanggal.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const last = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [{ data: pegawai }, { data: aturan }, { data: pres }] = await Promise.all([
    db.from("pegawai").select("id, nama, nip, unit_kerja(nama)").eq("instansi_id", user.instansiId).order("nama"),
    db.from("pengaturan_potongan").select("jenis, menit_dari, menit_sampai, persen_potongan").eq("instansi_id", user.instansiId),
    db
      .from("presensi")
      .select("pegawai_id, status, menit_keterlambatan, sesi_absensi_harian!inner(tanggal, instansi_id)")
      .eq("sesi_absensi_harian.instansi_id", user.instansiId)
      .gte("sesi_absensi_harian.tanggal", first)
      .lte("sesi_absensi_harian.tanggal", last),
  ]);

  const aturanList = (aturan ?? []) as AturanPotongan[];

  // Kelompokkan presensi per pegawai.
  const byPeg = new Map<string, { status: string; menit: number; tanggal: string }[]>();
  for (const p of pres ?? []) {
    const tgl = (p.sesi_absensi_harian as unknown as { tanggal: string }).tanggal;
    (byPeg.get(p.pegawai_id as string) ?? byPeg.set(p.pegawai_id as string, []).get(p.pegawai_id as string)!).push({
      status: p.status as string,
      menit: p.menit_keterlambatan as number,
      tanggal: tgl,
    });
  }

  const rows: RekapRow[] = (pegawai ?? []).map((pg) => {
    const list = byPeg.get(pg.id as string) ?? [];
    const hadirHari = new Set(list.filter((r) => r.status === "tepat_waktu" || r.status === "terlambat").map((r) => r.tanggal));
    const terlambat = list.filter((r) => r.status === "terlambat").length;
    const menit = list.filter((r) => r.status === "terlambat").reduce((s, r) => s + (r.menit || 0), 0);
    const tidakHadir = list.filter((r) => r.status === "tidak_hadir").length;
    const tidakDiKantor = list.filter((r) => r.status === "tidak_ada_di_kantor").length;
    const pot = hitungPotongan(list.map((r) => ({ status: r.status, menit_keterlambatan: r.menit })), aturanList);
    return {
      nama: pg.nama as string,
      nip: (pg.nip as string) ?? "-",
      unit: (pg.unit_kerja as unknown as { nama: string } | null)?.nama ?? "-",
      hadir: hadirHari.size,
      terlambat,
      menitTerlambat: menit,
      tidakHadir,
      tidakDiKantor,
      potonganPersen: pot.total_persen,
    };
  });

  const periode = `${String(m).padStart(2, "0")}-${y}`;
  try {
    const res = await exportRekapBulanan(spreadsheetId, `Rekap_${periode}`, periode, rows);
    return { ok: true, url: res.url, baris: res.baris };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Ekspor gagal." };
  }
}
