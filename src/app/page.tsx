import Link from "next/link";
import { ScanFace, ShieldCheck, MonitorSmartphone, ChevronRight } from "lucide-react";

export default function Home() {
  const entri = [
    { href: "/beranda", label: "Pegawai", desc: "Absen 3 sesi harian", icon: ScanFace, primary: true },
    { href: "/kiosk/tampilan", label: "Mode Kiosk", desc: "Tampilkan QR di layar kantor", icon: MonitorSmartphone },
    { href: "/admin", label: "Panel Admin", desc: "Kelola pegawai, jam kerja, kiosk", icon: ShieldCheck },
  ];

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 grid size-16 place-items-center rounded-[1.4rem] bg-brand text-brand-fg shadow-[var(--shadow-lg)]">
            <QRGlyph />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">QRensi</h1>
          <p className="mt-1.5 text-sm text-muted">
            Presensi ASN Kotabaru — QR dinamis &amp; verifikasi wajah
          </p>
        </div>

        <div className="space-y-3">
          {entri.map(({ href, label, desc, icon: Icon, primary }) => (
            <Link
              key={href}
              href={href}
              className={`pressable flex items-center gap-4 rounded-2xl p-4 shadow-[var(--shadow-sm)] ${
                primary
                  ? "bg-brand text-brand-fg"
                  : "border border-border bg-surface"
              }`}
            >
              <div
                className={`grid size-11 place-items-center rounded-xl ${
                  primary ? "bg-white/15" : "bg-surface-2"
                }`}
              >
                <Icon className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold">{label}</div>
                <div className={`text-xs ${primary ? "text-brand-fg/70" : "text-muted"}`}>
                  {desc}
                </div>
              </div>
              <ChevronRight className={`size-5 ${primary ? "opacity-70" : "text-muted"}`} />
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted">Fase 0 — Fondasi · zero-budget PWA</p>
      </div>
    </main>
  );
}

function QRGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3M20 14v3M14 20h3M20 17v4" />
    </svg>
  );
}
