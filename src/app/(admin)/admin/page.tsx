export default function AdminHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Panel Admin</h1>
      <p className="text-sm text-slate-500">
        Pilih modul di menu. Fase 0 fokus pada pengaturan <strong>Pola Hari Kerja</strong> dan{" "}
        <strong>Jam Kerja Sesi</strong>. Modul lain menyusul sesuai roadmap.
      </p>
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        Hubungkan Supabase (<code>.env.local</code>) &amp; jalankan migration di{" "}
        <code>supabase/migrations/</code> untuk mengaktifkan data. Lihat{" "}
        <code>docs/SETUP_CHECKLIST.md</code>.
      </div>
    </div>
  );
}
