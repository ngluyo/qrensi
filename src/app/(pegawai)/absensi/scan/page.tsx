"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { STATUS_META, type StatusKey } from "@/lib/status-presensi";

type Phase = "scanning" | "submitting" | "result";
interface Result {
  ok: boolean;
  jenis?: string;
  status?: StatusKey;
  menit?: number;
  errorMsg?: string;
}

const ERROR_MSG: Record<string, string> = {
  token_invalid: "QR tidak valid. Pindai kode yang tampil di kiosk.",
  token_terpakai: "Kode sudah dipakai / kedaluwarsa. Pindai kode terbaru di kiosk.",
  di_luar_jendela: "Saat ini di luar jendela absensi.",
  sudah_absen: "Kamu sudah absen untuk sesi ini.",
  unauthorized: "Sesi login habis. Silakan masuk lagi.",
  bukan_pegawai: "Akun ini belum terdaftar sebagai pegawai.",
};

export default function ScanPage() {
  const [phase, setPhase] = useState<Phase>("scanning");
  const [result, setResult] = useState<Result | null>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lockRef = useRef(false);

  async function submit(tokenValue: string) {
    setPhase("submitting");
    try {
      const res = await fetch("/api/presensi/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_value: tokenValue }),
      });
      const data = await res.json();
      if (data.ok) {
        navigator.vibrate?.([20, 40, 20]);
        setResult({ ok: true, jenis: data.jenis, status: data.status, menit: data.menit_keterlambatan });
      } else {
        navigator.vibrate?.(80);
        setResult({ ok: false, errorMsg: ERROR_MSG[data.error] ?? "Gagal memproses. Coba lagi." });
      }
    } catch {
      setResult({ ok: false, errorMsg: "Tidak ada koneksi. Coba lagi." });
    } finally {
      setPhase("result");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (lockRef.current) return;
            lockRef.current = true;
            scanner.stop().catch(() => {});
            submit(decoded);
          },
          () => {},
        );
      } catch {
        if (!cancelled) setResult({ ok: false, errorMsg: "Kamera tidak bisa diakses. Izinkan akses kamera." });
        if (!cancelled) setPhase("result");
      }
    })();
    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  function ulang() {
    lockRef.current = false;
    setResult(null);
    setPhase("scanning");
    // remount scanner
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link href="/beranda" className="pressable grid size-9 place-items-center rounded-xl bg-surface shadow-[var(--shadow-sm)]">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Pindai QR Kiosk</h1>
          <p className="text-xs text-muted">Arahkan kamera ke QR di kiosk kantor.</p>
        </div>
      </header>

      {phase !== "result" && (
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-black shadow-[var(--shadow-lg)]">
          <div id="qr-reader" className="aspect-square w-full [&_video]:size-full [&_video]:object-cover" />
          {/* bingkai pemindai */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="size-56 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          {phase === "submitting" && (
            <div className="absolute inset-0 grid place-items-center bg-black/50 text-white">
              <Loader2 className="size-8 animate-spin" />
            </div>
          )}
        </div>
      )}

      {phase === "result" && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          className="rounded-[var(--radius-lg)] bg-surface p-8 text-center shadow-[var(--shadow-lg)]"
        >
          {result.ok ? (
            <>
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-success text-white">
                <Check className="size-9" strokeWidth={3} />
              </div>
              <h2 className="mt-4 text-xl font-extrabold capitalize">Absen {result.jenis} berhasil</h2>
              <p className="mt-1 text-sm text-muted">
                Status: <strong>{result.status ? STATUS_META[result.status]?.label : "-"}</strong>
                {result.menit ? ` · telat ${result.menit} menit` : ""}
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-danger text-white">
                <X className="size-9" strokeWidth={3} />
              </div>
              <h2 className="mt-4 text-lg font-bold">Belum berhasil</h2>
              <p className="mt-1 text-sm text-muted">{result.errorMsg}</p>
            </>
          )}
          <div className="mt-6 flex gap-3">
            <button
              onClick={ulang}
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-3 font-bold text-brand-fg"
            >
              <RefreshCw className="size-4" /> Pindai lagi
            </button>
            <Link
              href="/beranda"
              className="pressable flex flex-1 items-center justify-center rounded-xl bg-surface-2 py-3 font-bold"
            >
              Selesai
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
