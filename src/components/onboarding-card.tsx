"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { NotifToggle } from "@/components/notif-toggle";

export interface LangkahOnboarding {
  kunci: "password" | "wajah" | "notifikasi";
  judul: string;
  desc: string;
  selesai: boolean;
  href?: string;
  catatan?: string;
}

/**
 * Kartu onboarding pegawai baru (MASTERPLAN 3.1): tampil sampai semua langkah
 * beres, lalu hilang sendiri.
 */
export function OnboardingCard({ langkah: langkahAwal }: { langkah: LangkahOnboarding[] }) {
  // Status notifikasi hanya diketahui di klien (izin browser + langganan push).
  // `null` = belum diperiksa → sembunyikan kartu dulu agar tidak berkedip.
  const [notifSiap, setNotifSiap] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setNotifSiap(true); // tak didukung → jangan tagih langkah ini
      return;
    }
    if (Notification.permission !== "granted") {
      setNotifSiap(false);
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setNotifSiap(!!sub))
      .catch(() => setNotifSiap(true));
  }, []);

  if (notifSiap === null) return null;

  const langkah = langkahAwal.map((l) =>
    l.kunci === "notifikasi" ? { ...l, selesai: notifSiap } : l,
  );
  const belum = langkah.filter((l) => !l.selesai);
  if (belum.length === 0) return null;

  const selesai = langkah.length - belum.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="space-y-3 rounded-[var(--radius-lg)] border border-brand/25 bg-brand-soft p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-brand">
          <Sparkles className="size-4" /> Lengkapi akun Anda
        </h2>
        <span className="tabular text-xs font-semibold text-brand">{selesai}/{langkah.length}</span>
      </div>

      {/* Progres */}
      <div className="h-1.5 overflow-hidden rounded-full bg-brand/15">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${(selesai / langkah.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-2">
        {langkah.map((l) => {
          const isi = (
            <>
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${
                  l.selesai ? "border-transparent bg-success text-white" : "border-brand/40 bg-surface"
                }`}
              >
                {l.selesai && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${l.selesai ? "text-muted line-through" : ""}`}>
                  {l.judul}
                </span>
                <span className="block text-xs text-muted">{l.catatan ?? l.desc}</span>
              </span>
              {!l.selesai && l.href && <ChevronRight className="size-4 shrink-0 text-brand" />}
            </>
          );

          // Langkah notifikasi memakai komponen toggle sendiri.
          if (l.kunci === "notifikasi" && !l.selesai) {
            return (
              <li key={l.kunci} className="rounded-xl bg-surface">
                <NotifToggle />
              </li>
            );
          }

          return (
            <li key={l.kunci}>
              {l.href && !l.selesai ? (
                <Link href={l.href} className="pressable flex items-center gap-3 rounded-xl bg-surface p-3">
                  {isi}
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-surface/60 p-3">{isi}</div>
              )}
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
