"use client";

import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { StatusKey } from "@/lib/status-presensi";

const LEGENDA = [
  { tone: "bg-success", label: "Tepat waktu" },
  { tone: "bg-warning", label: "Terlambat" },
  { tone: "bg-info", label: "Tidak di kantor" },
  { tone: "bg-danger", label: "Alpa" },
];

// Prioritas warna dominan per hari.
function dominan(statuses: StatusKey[]): string | null {
  if (statuses.includes("tidak_hadir")) return "bg-danger";
  if (statuses.includes("terlambat") || statuses.includes("pulang_cepat")) return "bg-warning";
  if (statuses.includes("tidak_ada_di_kantor")) return "bg-info";
  if (statuses.includes("tepat_waktu")) return "bg-success";
  return null;
}

export function RiwayatClient({
  year,
  month,
  perHari,
  summary,
  potonganPersen,
}: {
  year: number;
  month: number; // 0=Jan
  perHari: Record<string, StatusKey[]>;
  summary: { hadir: number; terlambat: number; tidakHadir: number; tidakDiKantor: number } | null;
  potonganPersen: number;
}) {
  const firstDay = new Date(year, month, 1);
  const jumlahHari = new Date(year, month + 1, 0).getDate();
  // Offset Senin-first: JS getDay 0=Min..6=Sab -> Senin=0.
  const offset = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: jumlahHari }, (_, i) => i + 1),
  ];
  const namaHariKol = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  const tiles = [
    { label: "Hadir", nilai: summary?.hadir ?? 0, tone: "text-success" },
    { label: "Terlambat", nilai: summary?.terlambat ?? 0, tone: "text-warning" },
    { label: "Tdk di kantor", nilai: summary?.tidakDiKantor ?? 0, tone: "text-info" },
    { label: "Alpa", nilai: summary?.tidakHadir ?? 0, tone: "text-danger" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Riwayat</h1>
        <p className="mt-1 text-sm capitalize text-muted">
          {format(firstDay, "MMMM yyyy", { locale: id })}
        </p>
      </header>

      {/* Kalender */}
      <div className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)]">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
          {namaHariKol.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const tgl = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const warna = dominan(perHari[tgl] ?? []);
            return (
              <div
                key={tgl}
                className="relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm"
              >
                <span className={warna ? "font-bold" : "text-muted"}>{day}</span>
                {warna && <span className={`mt-0.5 size-1.5 rounded-full ${warna}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {LEGENDA.map((l) => (
          <span key={l.label} className="flex items-center gap-2 text-xs text-muted">
            <span className={`size-2.5 rounded-full ${l.tone}`} /> {l.label}
          </span>
        ))}
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-surface p-3 text-center shadow-[var(--shadow-sm)]">
            <div className={`tabular text-2xl font-extrabold leading-none ${t.tone}`}>{t.nilai}</div>
            <div className="mt-1 text-[10px] leading-tight text-muted">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Potongan */}
      <div className="flex items-center justify-between rounded-2xl bg-brand p-4 text-brand-fg shadow-[var(--shadow-md)]">
        <div>
          <div className="text-xs opacity-70">Estimasi potongan bulan ini</div>
          <div className="tabular text-2xl font-extrabold">{potonganPersen.toFixed(2)}%</div>
        </div>
        <p className="max-w-[9rem] text-right text-[10px] opacity-70">
          dari tunjangan kinerja · dihitung bagian keuangan
        </p>
      </div>
    </div>
  );
}
