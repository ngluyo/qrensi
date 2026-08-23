import { requireSuperAdmin } from "@/lib/auth";
import { jalankanDiagnostik, type Tingkat } from "@/lib/diagnostik";
import { CheckCircle2, AlertTriangle, XCircle, Stethoscope, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

const IKON: Record<Tingkat, typeof CheckCircle2> = {
  ok: CheckCircle2,
  peringatan: AlertTriangle,
  gagal: XCircle,
};
const WARNA: Record<Tingkat, string> = {
  ok: "text-success bg-success-soft",
  peringatan: "text-warning bg-warning-soft",
  gagal: "text-danger bg-danger-soft",
};

export default async function DiagnostikPage() {
  await requireSuperAdmin();
  const d = await jalankanDiagnostik();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Stethoscope className="size-6" /> Diagnostik Sistem
        </h1>
        <p className="mt-1 text-sm text-muted">
          Pemeriksaan kesehatan instalasi. Berguna saat pertama memasang aplikasi maupun ketika
          ada yang tidak beres. Nilai rahasia tidak pernah ditampilkan.
        </p>
      </header>

      {/* Ringkasan */}
      <section
        className={`rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-md)] ${
          d.siapProduksi ? "bg-success text-white" : "bg-danger text-white"
        }`}
      >
        <div className="text-xs font-medium uppercase tracking-wider opacity-80">Status instalasi</div>
        <div className="mt-1 text-2xl font-extrabold">
          {d.siapProduksi ? "Siap digunakan" : "Ada yang perlu diperbaiki"}
        </div>
        <div className="tabular mt-3 flex flex-wrap gap-4 text-sm">
          <span>✓ {d.ringkas.ok} baik</span>
          <span>⚠ {d.ringkas.peringatan} peringatan</span>
          <span>✕ {d.ringkas.gagal} gagal</span>
        </div>
      </section>

      {/* Kelompok pemeriksaan */}
      {d.kelompok.map((k) => (
        <section key={k.judul} className="space-y-2">
          <h2 className="text-sm font-bold text-muted">{k.judul}</h2>
          <div className="space-y-2">
            {k.periksa.map((p) => {
              const Icon = IKON[p.tingkat];
              return (
                <div key={p.nama} className="flex gap-3 rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-sm)]">
                  <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${WARNA[p.tingkat]}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{p.nama}</span>
                      {p.wajib && (
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-muted">
                          WAJIB
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">{p.pesan}</div>
                    {p.saran && (
                      <div className="mt-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs">{p.saran}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <a
        href="https://github.com/ngluyo/qrensi/blob/main/docs/INSTALASI.md"
        target="_blank"
        rel="noopener noreferrer"
        className="pressable flex items-center gap-2 rounded-2xl bg-surface p-4 text-sm font-semibold shadow-[var(--shadow-sm)]"
      >
        <ExternalLink className="size-4 text-muted" /> Buka panduan instalasi lengkap
      </a>
    </div>
  );
}
