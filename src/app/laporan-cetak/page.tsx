import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { scopeUnits } from "@/lib/izin";
import { computeRekapBulanan, periodeDari } from "@/lib/rekap";
import { getPengaturan } from "@/lib/pengaturan";
import { PrintButton } from "./print-button";
import { FilterLaporan } from "./filter-laporan";

type SP = { [k: string]: string | string[] | undefined };

export default async function LaporanCetakPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const db = createAdminClient();

  const p = await getPengaturan();
  const { data: inst } = await db
    .from("instansi")
    .select("nama, timezone")
    .eq("id", user.instansiId)
    .single();
  const tz = inst?.timezone ?? p.timezone;

  const rentang = periodeDari(sp.dari as string, sp.sampai as string, tz);

  // Lingkup unit: admin OPD dikunci ke unitnya; super admin bisa memfilter.
  const lingkup = scopeUnits(user);
  const unitPilihan = (sp.unit as string) || "";
  let unitIds: string[] | null = lingkup;
  if (unitPilihan) {
    unitIds = lingkup ? lingkup.filter((u) => u === unitPilihan) : [unitPilihan];
  }

  let unitQ = db.from("unit_kerja").select("id, nama").eq("instansi_id", user.instansiId).order("nama");
  if (lingkup) unitQ = unitQ.in("id", lingkup.length ? lingkup : ["-"]);
  const { data: units } = await unitQ;

  const { rows } = await computeRekapBulanan(db, user.instansiId!, {
    periode: rentang,
    unitKerjaIds: unitIds,
  });

  const total = rows.reduce(
    (a, r) => ({
      hadir: a.hadir + r.hadir,
      terlambat: a.terlambat + r.terlambat,
      menit: a.menit + r.menitTerlambat,
      alpa: a.alpa + r.tidakHadir,
      tdk: a.tdk + r.tidakDiKantor,
    }),
    { hadir: 0, terlambat: 0, menit: 0, alpa: 0, tdk: 0 },
  );

  const namaUnit = unitPilihan ? units?.find((u) => u.id === unitPilihan)?.nama : null;

  return (
    <main className="mx-auto max-w-5xl bg-white p-6 text-slate-900 print:p-0 md:p-8">
      <style>{`@media print { .no-print { display:none !important } @page { margin: 12mm; size: A4 landscape } body { background:#fff } }`}</style>

      <div className="no-print mb-5 space-y-4">
        <div className="flex items-center justify-between">
          <a href="/admin/laporan" className="text-sm font-semibold text-slate-500">← Kembali</a>
          <PrintButton />
        </div>
        <FilterLaporan
          units={units ?? []}
          dari={rentang.dari}
          sampai={rentang.sampai}
          unit={unitPilihan}
        />
      </div>

      <header className="mb-5 border-b-2 border-slate-800 pb-3 text-center">
        <h1 className="text-lg font-bold uppercase">Rekapitulasi Presensi Pegawai</h1>
        <p className="text-sm">{inst?.nama ?? p.namaOrganisasi}</p>
        <p className="text-sm">
          Periode: {rentang.dari} s/d {rentang.sampai}
          {namaUnit ? ` · Unit: ${namaUnit}` : ""}
        </p>
      </header>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100 text-left">
            {["No", "Nama", "NIP", "Unit", "Hadir", "Telat", "Menit", "Alpa", "Tdk di Kantor", "Potongan %"].map((h) => (
              <th key={h} className="border border-slate-300 px-2 py-1.5 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border border-slate-300 px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-slate-300 px-2 py-1">{r.nama}</td>
              <td className="border border-slate-300 px-2 py-1">{r.nip}</td>
              <td className="border border-slate-300 px-2 py-1">{r.unit}</td>
              <td className="border border-slate-300 px-2 py-1 text-center">{r.hadir}</td>
              <td className="border border-slate-300 px-2 py-1 text-center">{r.terlambat}</td>
              <td className="border border-slate-300 px-2 py-1 text-center">{r.menitTerlambat}</td>
              <td className="border border-slate-300 px-2 py-1 text-center">{r.tidakHadir}</td>
              <td className="border border-slate-300 px-2 py-1 text-center">{r.tidakDiKantor}</td>
              <td className="border border-slate-300 px-2 py-1 text-center">{r.potonganPersen}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="border border-slate-300 px-2 py-6 text-center text-slate-500">
                Tidak ada data pada periode ini.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-bold">
            <td className="border border-slate-300 px-2 py-1 text-center" colSpan={4}>
              Total ({rows.length} pegawai)
            </td>
            <td className="border border-slate-300 px-2 py-1 text-center">{total.hadir}</td>
            <td className="border border-slate-300 px-2 py-1 text-center">{total.terlambat}</td>
            <td className="border border-slate-300 px-2 py-1 text-center">{total.menit}</td>
            <td className="border border-slate-300 px-2 py-1 text-center">{total.alpa}</td>
            <td className="border border-slate-300 px-2 py-1 text-center">{total.tdk}</td>
            <td className="border border-slate-300 px-2 py-1" />
          </tr>
        </tfoot>
      </table>

      <div className="mt-10 flex justify-end text-sm">
        <div className="text-center">
          <p>
            {p.namaOrganisasi.split(" ").slice(-1)[0]},{" "}
            {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="mt-1">Mengetahui,</p>
          <div className="h-16" />
          <p className="font-bold underline">( ................................ )</p>
        </div>
      </div>
    </main>
  );
}
