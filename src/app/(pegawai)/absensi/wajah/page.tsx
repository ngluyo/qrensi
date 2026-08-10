"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ScanFace, Loader2, Check, X } from "lucide-react";
import { loadFaceModels, getDescriptor } from "@/lib/face";

const FACE_LS = "qrensi_face_token";
type Phase = "init" | "ready" | "verifying" | "ok" | "gagal" | "error";

export default function WajahPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("init");
  const [msg, setMsg] = useState("Memuat model wajah…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadFaceModels();
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPhase("ready");
        setMsg("");
      } catch {
        setPhase("error");
        setMsg("Kamera/model gagal dimuat. Izinkan akses kamera.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function goScan() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.push("/absensi/scan");
  }

  async function verify() {
    if (!videoRef.current) return;
    setPhase("verifying");
    setMsg("Memverifikasi wajah…");
    const desc = await getDescriptor(videoRef.current);
    if (!desc) {
      setPhase("ready");
      setMsg("Wajah tidak terdeteksi. Posisikan wajah di tengah.");
      return;
    }
    try {
      const res = await fetch("/api/face/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: desc }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(FACE_LS, JSON.stringify({ token: data.face_session_token, exp: data.expires_at }));
        navigator.vibrate?.([20, 40, 20]);
        setPhase("ok");
        setMsg("Wajah cocok. Lanjut memindai QR…");
        setTimeout(goScan, 700);
      } else if (data.error === "belum_enroll") {
        // Belum di-enroll: lanjut tanpa token (gating dilewati server).
        setPhase("ok");
        setMsg("Wajah belum terdaftar — lanjut ke scan.");
        setTimeout(goScan, 700);
      } else {
        navigator.vibrate?.(80);
        setPhase("gagal");
        setMsg(data.error === "wajah_tidak_cocok" ? "Wajah tidak cocok dengan data. Coba lagi." : "Verifikasi gagal. Coba lagi.");
      }
    } catch {
      setPhase("gagal");
      setMsg("Tidak ada koneksi. Coba lagi.");
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link href="/beranda" className="pressable grid size-9 place-items-center rounded-xl bg-surface shadow-[var(--shadow-sm)]">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Verifikasi Wajah</h1>
          <p className="text-xs text-muted">Langkah 1 dari 2 · pastikan cahaya cukup.</p>
        </div>
      </header>

      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-black shadow-[var(--shadow-lg)]">
        <video ref={videoRef} playsInline muted className="size-full object-cover [transform:scaleX(-1)]" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className={`size-56 rounded-full border-2 ${
              phase === "ok" ? "border-success" : phase === "gagal" ? "border-danger" : "border-white/80"
            } shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]`}
          />
        </div>
        {(phase === "init" || phase === "verifying") && (
          <div className="absolute inset-0 grid place-items-center bg-black/50 text-white">
            <Loader2 className="size-8 animate-spin" />
          </div>
        )}
        {phase === "ok" && (
          <div className="absolute inset-0 grid place-items-center bg-success/20">
            <div className="grid size-16 place-items-center rounded-full bg-success text-white">
              <Check className="size-9" strokeWidth={3} />
            </div>
          </div>
        )}
        {phase === "gagal" && (
          <div className="absolute inset-0 grid place-items-center bg-danger/20">
            <div className="grid size-16 place-items-center rounded-full bg-danger text-white">
              <X className="size-9" strokeWidth={3} />
            </div>
          </div>
        )}
      </div>

      {msg && <p className={`text-center text-sm ${phase === "error" || phase === "gagal" ? "text-danger" : "text-muted"}`}>{msg}</p>}

      <button
        onClick={verify}
        disabled={phase === "init" || phase === "verifying" || phase === "ok"}
        className="pressable flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-bold text-brand-fg disabled:opacity-50"
      >
        <ScanFace className="size-5" /> {phase === "gagal" ? "Coba lagi" : "Verifikasi wajah"}
      </button>
    </div>
  );
}
