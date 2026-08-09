import { ScanFace, QrCode, ArrowRight } from "lucide-react";

export default function AbsensiPage() {
  const langkah = [
    { n: 1, judul: "Verifikasi wajah", desc: "Kamera memindai wajah, diverifikasi di server", icon: ScanFace },
    { n: 2, judul: "Scan QR kiosk", desc: "Arahkan kamera ke QR di kiosk kantor", icon: QrCode },
  ];
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Absensi</h1>
        <p className="mt-1 text-sm text-muted">Dua langkah cepat untuk mencatat kehadiran.</p>
      </header>

      <div className="space-y-3">
        {langkah.map((l) => (
          <div
            key={l.n}
            className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand">
              <l.icon className="size-6" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-muted">Langkah {l.n}</div>
              <div className="font-bold">{l.judul}</div>
              <div className="text-xs text-muted">{l.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        disabled
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-text/10 py-4 font-bold text-muted"
      >
        Mulai <ArrowRight className="size-5" />
      </button>
      <p className="text-center text-xs text-muted">
        Alur kamera &amp; verifikasi dibangun pada Fase 2 (face recognition server-side).
      </p>
    </div>
  );
}
