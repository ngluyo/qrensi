export default function Page() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Pola Hari Kerja</h1>
      <p className="text-sm text-slate-500">Buat/edit pola (Senin-Jumat, Senin-Sabtu) via checkbox 7 hari.</p>
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
        Editor pola — dihubungkan ke tabel pola_hari_kerja setelah Supabase aktif.
      </div>
    </div>
  );
}
