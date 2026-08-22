import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { computeRekapBulanan } from "@/lib/rekap";
import { PrintButton } from "./print-button";

export default async function LaporanCetakPage() {
  const user = await requireAdmin();
  const db = createAdminClient();
  const { data: inst } = await db.from("instansi").select("nama").eq("id", user.instansiId).single();
  const { periode, rows } = await computeRekapBulanan(db, user.instansiId!);

  const total = rows.reduce(
    (a, r) => ({
      hadir: a.hadir + r.hadir,
      terlambat: a.terlambat + r.terlambat,
      menit: a.menit + r.menitTerlambat,
      alpa: a.alpa + r.tidakHadir,
    }),
    { hadir: 0, terlambat: 0, menit: 0, alpa: 0 },
  );

  return (
    <main className="mx-auto max-w-4xl bg-white p-8 text-slate-900 print:p-0">
      <style>{`@media print { .no-print { display:none !important } @page { margin: 14mm } body { background:#fff } }`}</style>

      <div className="mb-4 flex items-center justify-between no-print">
        <a href="/admin/laporan" className="text-sm font-semibold text-slate-500">← Kembali</a>
        <PrintButton />
      </div>

      <header className="mb-6 border-b-2 border-slate-800 pb-4 text-center">
        <h1 className="text-xl font-bold uppercase">Rekap Presensi Pegawai</h1>
        <p className="text-sm">{inst?.nama ?? "-"}</p>
        <p className="text-sm">Periode: {periode}</p>
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
            <tr><td colSpan={10} className="border border-slate-300 px-2 py-4 text-center text-slate-500">Belum ada data.</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-bold">
            <td className="border border-slate-300 px-2 py-1 text-center" colSpan={4}>Total</td>
            <td className="border border-slate-300 px-2 py-1 text-center">{total.hadir}</td>
            <td className="border border-slate-300 px-2 py-1 text-center">{total.terlambat}</td>
            <td className="border border-slate-300 px-2 py-1 text-center">{total.menit}</td>
            <td className="border border-slate-300 px-2 py-1 text-center">{total.alpa}</td>
            <td className="border border-slate-300 px-2 py-1" colSpan={2}></td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-10 flex justify-end text-sm">
        <div className="text-center">
          <p>Kotabaru, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p className="mt-1">Mengetahui,</p>
          <div className="h-16" />
          <p className="font-bold underline">( ................................ )</p>
        </div>
      </div>
    </main>
  );
}
