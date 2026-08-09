const legenda = [
  { tone: "bg-success", label: "Tepat waktu" },
  { tone: "bg-warning", label: "Terlambat" },
  { tone: "bg-info", label: "Tidak di kantor" },
  { tone: "bg-danger", label: "Alpa" },
];

export default function RiwayatPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Riwayat</h1>
        <p className="mt-1 text-sm text-muted">Kalender kehadiran &amp; rekap potongan.</p>
      </header>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {legenda.map((l) => (
          <span key={l.label} className="flex items-center gap-2 text-xs text-muted">
            <span className={`size-2.5 rounded-full ${l.tone}`} /> {l.label}
          </span>
        ))}
      </div>

      <div className="rounded-2xl bg-surface p-8 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
        Kalender bulanan &amp; rekap potongan tampil di sini (Fase 1).
      </div>
    </div>
  );
}
