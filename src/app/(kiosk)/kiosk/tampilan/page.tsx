import { QrCode } from "lucide-react";

export default function KioskTampilanPage() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-center gap-8 overflow-hidden bg-[oklch(0.16_0.02_250)] p-8 text-white">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]" />

      <div className="relative text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">QRensi Kiosk</p>
        <h1 className="mt-2 text-2xl font-bold">Pindai untuk Absen</h1>
        <p className="mt-1 text-sm text-white/50">Arahkan kamera HP ke kode di bawah</p>
      </div>

      <div className="relative rounded-[2rem] bg-white p-10 shadow-2xl">
        <QrCode className="size-64 text-[oklch(0.16_0.02_250)]" strokeWidth={1.5} />
      </div>

      <div className="relative flex items-center gap-2 text-sm text-white/60">
        <span className="size-2 animate-pulse rounded-full bg-success" />
        Menunggu pindaian…
      </div>

      <p className="absolute bottom-6 text-[11px] text-white/30">
        Rotasi instan-saat-klaim &amp; feed real-time dibangun pada Fase 1
      </p>
    </main>
  );
}
