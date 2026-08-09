export default function Page() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Jam Kerja Sesi</h1>
      <p className="text-sm text-slate-500">Atur jam buka/tutup/batas per pola x hari x sesi (masuk/istirahat/pulang).</p>
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
        Editor jam kerja — dihubungkan ke tabel jam_kerja_sesi setelah Supabase aktif.
      </div>
    </div>
  );
}
