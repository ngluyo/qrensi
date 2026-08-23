"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { KeyRound, WifiOff, Clock } from "lucide-react";

const LS_KEY = "qrensi_kiosk_secret";
const LS_INSTANCE = "qrensi_kiosk_instance";
const POLL_MS = 3000;

type Status = "setup" | "loading" | "open" | "closed" | "error" | "terikat";

/** Id acak unik per perangkat (dibuat sekali, disimpan permanen). */
function getInstanceId(): string {
  let id = localStorage.getItem(LS_INSTANCE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LS_INSTANCE, id);
  }
  return id;
}

export default function KioskTampilanPage({ namaAplikasi = "QRensi", namaOrganisasi = "" }: { namaAplikasi?: string; namaOrganisasi?: string }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ambil secret dari localStorage saat mount.
  useEffect(() => {
    const s = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (s) setSecret(s);
    else setStatus("setup");
  }, []);

  // Jam dinding.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const poll = useCallback(async () => {
    if (!secret) return;
    try {
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_secret: secret, device_instance_id: getInstanceId() }),
      });
      if (res.status === 401) {
        setStatus("error");
        return; // stop polling (secret salah/nonaktif)
      }
      if (res.status === 409) {
        setStatus("terikat");
        return; // stop polling (terikat perangkat lain)
      }
      const data = await res.json();
      if (data.open && data.token_value) {
        const url = await QRCode.toDataURL(data.token_value, {
          width: 520,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#0b1220", light: "#ffffff" },
        });
        setQrDataUrl(url);
        setStatus("open");
      } else {
        setStatus("closed");
      }
      timer.current = setTimeout(poll, POLL_MS); // lanjut polling
    } catch {
      // Koneksi putus sesaat: pertahankan tampilan terakhir, coba lagi.
      timer.current = setTimeout(poll, POLL_MS);
    }
  }, [secret]);

  useEffect(() => {
    if (secret) {
      setStatus("loading");
      poll();
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [secret, poll]);

  function saveSecret(e: React.FormEvent) {
    e.preventDefault();
    const s = input.trim();
    if (!s) return;
    localStorage.setItem(LS_KEY, s);
    setSecret(s);
  }

  // ---- Layar setup (paste device secret) ----
  if (status === "setup" || !secret) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center bg-[oklch(0.16_0.02_250)] p-8 text-white">
        <form onSubmit={saveSecret} className="w-full max-w-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <KeyRound className="size-5" /> Setup Kiosk
          </div>
          <p className="text-sm text-white/60">
            Tempel <em>device secret</em> dari panel admin (Perangkat Kiosk).
          </p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="device secret…"
            className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/30"
          />
          <button className="w-full rounded-xl bg-white py-3 font-bold text-slate-900">
            Simpan &amp; mulai
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-center gap-8 overflow-hidden bg-[oklch(0.16_0.02_250)] p-8 text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]" />

      <div className="relative text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">{namaAplikasi} Kiosk</p>
        <h1 className="mt-2 text-3xl font-bold">Pindai untuk Absen</h1>
        {namaOrganisasi && <p className="mt-1 text-sm text-white/50">{namaOrganisasi}</p>}
      </div>

      <div className="relative grid size-[min(70vw,32rem)] place-items-center rounded-[2rem] bg-white p-6 shadow-2xl">
        {status === "open" && qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="QR presensi" className="size-full" />
        ) : status === "closed" ? (
          <div className="text-center text-slate-500">
            <Clock className="mx-auto size-16" />
            <p className="mt-3 font-semibold">Belum ada sesi absensi</p>
            <p className="text-sm">QR muncul otomatis saat jendela sesi terbuka.</p>
          </div>
        ) : status === "error" || status === "terikat" ? (
          <div className="text-center text-danger">
            <WifiOff className="mx-auto size-16" />
            <p className="mt-3 font-semibold">
              {status === "terikat"
                ? "Secret ini sudah terikat ke perangkat lain"
                : "Secret salah / kiosk nonaktif"}
            </p>
            {status === "terikat" && (
              <p className="mx-auto mt-1 max-w-xs text-xs text-danger/70">
                Minta admin melakukan “Reset secret” di panel kiosk untuk memindahkan ke perangkat ini.
              </p>
            )}
            <button
              onClick={() => {
                localStorage.removeItem(LS_KEY);
                setSecret(null);
                setStatus("setup");
              }}
              className="mt-2 text-sm underline"
            >
              Atur ulang
            </button>
          </div>
        ) : (
          <div className="size-24 animate-pulse rounded-2xl bg-slate-200" />
        )}
      </div>

      <div className="relative flex items-center gap-2 text-sm text-white/60">
        {status === "open" && <span className="size-2 animate-pulse rounded-full bg-success" />}
        <span className="tabular">{now ? now.toLocaleTimeString("id-ID") : ""} WITA</span>
      </div>
    </main>
  );
}
