"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ScanLine, Check, ChevronRight, Sun, Lock } from "lucide-react";
import { STATUS_META, type StatusKey } from "@/lib/status-presensi";
import type { SesiHariIni } from "@/lib/presensi-data";

export function BerandaClient({
  nama,
  sesi,
  rekap,
}: {
  nama: string;
  sesi: SesiHariIni[];
  rekap: { hadir: number; terlambat: number; menit: number } | null;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const sesiAktif = sesi.find((s) => s.state === "aktif");
  const rekapTiles = [
    { label: "Hadir", nilai: rekap?.hadir ?? 0, sub: "hari" },
    { label: "Terlambat", nilai: rekap?.terlambat ?? 0, sub: "kali" },
    { label: "Menit telat", nilai: rekap?.menit ?? 0, sub: "menit" },
  ];

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Sun className="size-4" /> {now ? format(now, "EEEE, d MMMM", { locale: id }) : "—"}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">
            Halo, {nama.split(" ")[0]} 👋
          </h1>
        </div>
        <div className="tabular rounded-2xl bg-surface px-3 py-2 text-right shadow-[var(--shadow-sm)]">
          <div className="text-lg font-bold leading-none">{now ? format(now, "HH:mm") : "--:--"}</div>
          <div className="text-[10px] text-muted">WITA</div>
        </div>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.32, 0.72, 0, 1] }}
        className="relative overflow-hidden rounded-[var(--radius-lg)] bg-brand p-5 text-brand-fg shadow-[var(--shadow-lg)]"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 size-44 rounded-full bg-black/10 blur-2xl" />

        <p className="text-xs font-medium uppercase tracking-wider opacity-70">Absensi hari ini</p>

        {sesi.length === 0 ? (
          <p className="mt-4 text-sm opacity-80">Tidak ada jadwal sesi untuk hari ini.</p>
        ) : (
          <ol className="relative mt-4 space-y-1">
            {sesi.map((s, i) => (
              <li key={s.jenis} className="relative flex items-center gap-3 py-1.5">
                {i < sesi.length - 1 && (
                  <span className="absolute left-[11px] top-8 h-6 w-px bg-brand-fg/25" />
                )}
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${
                    s.state === "selesai"
                      ? "border-transparent bg-brand-fg text-brand"
                      : s.state === "aktif"
                        ? "border-brand-fg bg-brand-fg/15"
                        : "border-brand-fg/40 bg-transparent"
                  }`}
                >
                  {s.state === "selesai" ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : s.state === "aktif" ? (
                    <span className="size-2 animate-pulse rounded-full bg-brand-fg" />
                  ) : s.state === "terlewat" ? (
                    <Lock className="size-3 opacity-60" />
                  ) : null}
                </span>
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold leading-tight">{s.nama}</div>
                    <div className="tabular text-xs opacity-70">{s.jam}</div>
                  </div>
                  {s.status ? (
                    <span className="rounded-full bg-brand-fg/15 px-2.5 py-1 text-[11px] font-semibold">
                      {STATUS_META[s.status]?.label ?? s.status}
                      {s.menit ? ` ${s.menit}m` : ""}
                    </span>
                  ) : s.state === "aktif" ? (
                    <span className="rounded-full bg-brand-fg px-2.5 py-1 text-[11px] font-bold text-brand">
                      Sekarang
                    </span>
                  ) : s.state === "terlewat" ? (
                    <span className="text-[11px] opacity-60">Terlewat</span>
                  ) : (
                    <span className="text-[11px] opacity-60">Menunggu</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
      >
        <Link
          href="/absensi"
          className="pressable flex items-center justify-center gap-2.5 rounded-2xl bg-text py-4 text-base font-bold text-bg shadow-[var(--shadow-md)]"
        >
          <ScanLine className="size-5" />
          {sesiAktif ? `Absen ${sesiAktif.nama}` : "Mulai Absensi"}
        </Link>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Rekap bulan ini</h2>
          <Link href="/riwayat" className="flex items-center text-xs font-semibold text-brand">
            Lihat <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {rekapTiles.map((r) => (
            <div key={r.label} className="rounded-2xl bg-surface p-3 text-center shadow-[var(--shadow-sm)]">
              <div className="tabular text-2xl font-extrabold leading-none">{r.nilai}</div>
              <div className="mt-1 text-[11px] text-muted">
                {r.label}
                <span className="mt-0.5 block opacity-60">{r.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
