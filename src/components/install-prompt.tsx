"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const LS_TUTUP = "qrensi_install_ditutup";

/**
 * Ajakan pasang PWA ke home screen (MASTERPLAN 3.6).
 * Android/Chromium: pakai event `beforeinstallprompt`.
 * iOS: tak ada API → tampilkan panduan "Bagikan → Tambahkan ke Layar Utama".
 */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [tampil, setTampil] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(LS_TUTUP) === "1") return;

    // Sudah terpasang → jangan tampilkan.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    if (ios) {
      setTampil(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setTampil(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function tutup() {
    localStorage.setItem(LS_TUTUP, "1");
    setTampil(false);
  }

  async function pasang() {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") setTampil(false);
    else tutup();
  }

  if (!tampil) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand/25 bg-brand-soft p-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-fg">
        <Download className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-brand">Pasang QRensi di ponsel</div>
        {isIOS ? (
          <p className="mt-0.5 text-xs text-muted">
            Ketuk <Share className="inline size-3.5 align-text-bottom" /> <strong>Bagikan</strong> di Safari,
            lalu pilih <strong>Tambahkan ke Layar Utama</strong>.
          </p>
        ) : (
          <>
            <p className="mt-0.5 text-xs text-muted">
              Buka lebih cepat, layar penuh, dan bisa menerima notifikasi.
            </p>
            <button
              onClick={pasang}
              className="pressable mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-brand-fg"
            >
              Pasang sekarang
            </button>
          </>
        )}
      </div>
      <button onClick={tutup} aria-label="Tutup" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted">
        <X className="size-4" />
      </button>
    </div>
  );
}
