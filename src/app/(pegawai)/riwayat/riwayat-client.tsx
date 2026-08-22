"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Loader2, CalendarOff, Clock } from "lucide-react";
import { STATUS_META, TONE_CLASS, type StatusKey } from "@/lib/status-presensi";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { detailHari } from "./actions";
import type { DetailHari } from "@/lib/presensi-data";

const LEGENDA = [
  { tone: "bg-success", label: "Tepat waktu" },
  { tone: "bg-warning", label: "Terlambat" },
  { tone: "bg-info", label: "Tidak di kantor" },
  { tone: "bg-danger", label: "Alpa" },
];

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
  month: number;
  perHari: Record<string, StatusKey[]>;
  summary: { hadir: number; terlambat: number; tidakHadir: number; tidakDiKantor: number } | null;
  potonganPersen: number;
}) {
  const [pilih, setPilih] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailHari[] | null>(null);
  const [pending, start] = useTransition();

  const firstDay = new Date(year, month, 1);
  const jumlahHari = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7; // Senin dulu
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: jumlahHari }, (_, i) => i + 1)];
  const namaHariKol = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  const tiles = [
    { label: "Hadir", nilai: summary?.hadir ?? 0, tone: "text-success" },
    { label: "Terlambat", nilai: summary?.terlambat ?? 0, tone: "text-warning" },
    { label: "Tdk di kantor", nilai: summary?.tidakDiKantor ?? 0, tone: "text-info" },
    { label: "Alpa", nilai: summary?.tidakHadir ?? 0, tone: "text-danger" },
  ];

  function buka(tgl: string) {
    setPilih(tgl);
    setDetail(null);
    navigator.vibrate?.(8);
    start(async () => setDetail(await detailHari(tgl)));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Riwayat</h1>
        <p className="mt-1 text-sm capitalize text-muted">
          {format(firstDay, "MMMM yyyy", { locale: localeId })} · ketuk tanggal untuk rincian
        </p>
      </header>

      <div className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)]">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
          {namaHariKol.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const tgl = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const warna = dominan(perHari[tgl] ?? []);
            const adaData = !!perHari[tgl]?.length;
            return (
              <button
                key={tgl}
                onClick={() => buka(tgl)}
                aria-label={`Rincian ${day}`}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition ${
                  adaData ? "pressable hover:bg-surface-2" : "opacity-60"
                } ${pilih === tgl ? "ring-2 ring-brand" : ""}`}
              >
                <span className={warna ? "font-bold" : "text-muted"}>{day}</span>
                {warna && <span className={`mt-0.5 size-1.5 rounded-full ${warna}`} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {LEGENDA.map((l) => (
          <span key={l.label} className="flex items-center gap-2 text-xs text-muted">
            <span className={`size-2.5 rounded-full ${l.tone}`} /> {l.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-surface p-3 text-center shadow-[var(--shadow-sm)]">
            <div className={`tabular text-2xl font-extrabold leading-none ${t.tone}`}>{t.nilai}</div>
            <div className="mt-1 text-[10px] leading-tight text-muted">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-brand p-4 text-brand-fg shadow-[var(--shadow-md)]">
        <div>
          <div className="text-xs opacity-70">Estimasi potongan bulan ini</div>
          <div className="tabular text-2xl font-extrabold">{potonganPersen.toFixed(2)}%</div>
        </div>
        <p className="max-w-[9rem] text-right text-[10px] opacity-70">
          dari tunjangan kinerja · dihitung bagian keuangan
        </p>
      </div>

      {/* Rincian per hari */}
      <BottomSheet
        open={!!pilih}
        onClose={() => setPilih(null)}
        title={pilih ? format(new Date(pilih + "T00:00:00"), "EEEE, d MMMM yyyy", { locale: localeId }) : ""}
      >
        {pending || detail === null ? (
          <div className="space-y-2 py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
            ))}
            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted">
              <Loader2 className="size-3.5 animate-spin" /> Memuat rincian…
            </div>
          </div>
        ) : detail.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">
            <CalendarOff className="mx-auto mb-2 size-8 opacity-50" />
            Tidak ada catatan presensi pada tanggal ini.
          </div>
        ) : (
          <ul className="space-y-2 py-1">
            {detail.map((d) => {
              const meta = STATUS_META[d.status] ?? STATUS_META.belum;
              return (
                <li key={d.jenis} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface text-muted">
                    <Clock className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{d.nama}</div>
                    <div className="tabular text-xs text-muted">Jadwal {d.jadwal}</div>
                  </div>
                  <div className="text-right">
                    <div className="tabular font-bold">{d.jam ?? "—"}</div>
                    <span className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${TONE_CLASS[meta.tone]}`}>
                      {meta.label}{d.menit ? ` ${d.menit}m` : ""}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </BottomSheet>
    </div>
  );
}
