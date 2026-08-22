"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ScanFace, Loader2, Check, X, Eye, RefreshCw } from "lucide-react";
import { loadFaceModels, getDescriptor, getLandmarkMetrics, requestCamera, pesanErrorKamera } from "@/lib/face";

const FACE_LS = "qrensi_face_token";

// Ambang liveness
const EAR_CLOSED = 0.21;
const EAR_OPEN = 0.27;
const YAW_TURN = 0.16;
const BLINK_TARGET = 2;
const STEP_TIMEOUT_MS = 12000;

type Phase = "init" | "challenge" | "verifying" | "ok" | "gagal" | "error";
type Step = "kedip" | "toleh";

export default function WajahPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>("init");
  const [step, setStep] = useState<Step>("kedip");
  const [blinks, setBlinks] = useState(0);
  const [msg, setMsg] = useState("Memuat model wajah…");

  // state mutable untuk loop
  const eyesClosedRef = useRef(false);
  const blinkRef = useRef(0);
  const stepRef = useRef<Step>("kedip");
  const stepStartRef = useRef(0);
  const busyRef = useRef(false);

  function stopLoop() {
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = null;
  }
  function stopAll() {
    stopLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Kamera DULU agar prompt izin pasti muncul (ADR-0020).
      try {
        setMsg("Meminta izin kamera…");
        const stream = await requestCamera("user");
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setPhase("error");
        setMsg(pesanErrorKamera(e));
        return;
      }

      // 2) Baru muat model wajah.
      try {
        setMsg("Memuat model wajah…");
        await loadFaceModels();
        if (cancelled) return;
        startChallenge();
      } catch (e) {
        setPhase("error");
        setMsg("Model wajah gagal dimuat: " + ((e as Error)?.message ?? "tidak diketahui"));
      }
    })();
    return () => {
      cancelled = true;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startChallenge() {
    setPhase("challenge");
    setMsg("");
    setStep("kedip");
    setBlinks(0);
    eyesClosedRef.current = false;
    blinkRef.current = 0;
    stepRef.current = "kedip";
    stepStartRef.current = Date.now();
    stopLoop();
    loopRef.current = setInterval(tick, 160);
  }

  async function tick() {
    if (busyRef.current || !videoRef.current) return;
    busyRef.current = true;
    try {
      // timeout per langkah
      if (Date.now() - stepStartRef.current > STEP_TIMEOUT_MS) {
        stopLoop();
        setPhase("gagal");
        setMsg("Gerakan tidak terdeteksi. Coba lagi dengan cahaya cukup.");
        return;
      }
      const m = await getLandmarkMetrics(videoRef.current);
      if (!m) return;

      if (stepRef.current === "kedip") {
        if (m.ear < EAR_CLOSED) eyesClosedRef.current = true;
        else if (m.ear > EAR_OPEN && eyesClosedRef.current) {
          eyesClosedRef.current = false;
          blinkRef.current += 1;
          setBlinks(blinkRef.current);
        }
        if (blinkRef.current >= BLINK_TARGET) {
          stepRef.current = "toleh";
          stepStartRef.current = Date.now();
          setStep("toleh");
        }
      } else if (stepRef.current === "toleh") {
        if (Math.abs(m.yaw) > YAW_TURN) {
          stopLoop();
          await captureAndVerify();
        }
      }
    } finally {
      busyRef.current = false;
    }
  }

  async function captureAndVerify() {
    setPhase("verifying");
    setMsg("Memverifikasi wajah…");
    const desc = videoRef.current ? await getDescriptor(videoRef.current) : null;
    if (!desc) {
      setPhase("gagal");
      setMsg("Wajah tidak terdeteksi saat verifikasi. Coba lagi.");
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
        setTimeout(() => {
          stopAll();
          router.push("/absensi/scan");
        }, 700);
      } else if (data.error === "belum_enroll") {
        setPhase("ok");
        setMsg("Wajah belum terdaftar — lanjut ke scan.");
        setTimeout(() => {
          stopAll();
          router.push("/absensi/scan");
        }, 700);
      } else {
        navigator.vibrate?.(80);
        setPhase("gagal");
        setMsg(data.error === "wajah_tidak_cocok" ? "Wajah tidak cocok dengan data terdaftar." : "Verifikasi gagal. Coba lagi.");
      }
    } catch {
      setPhase("gagal");
      setMsg("Tidak ada koneksi. Coba lagi.");
    }
  }

  const instruksi =
    step === "kedip" ? `Kedipkan mata (${blinks}/${BLINK_TARGET})` : "Tolehkan kepala ke samping";

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link href="/beranda" onClick={stopAll} className="pressable grid size-9 place-items-center rounded-xl bg-surface shadow-[var(--shadow-sm)]">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Verifikasi Wajah</h1>
          <p className="text-xs text-muted">Langkah 1 dari 2 · deteksi wajah asli.</p>
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
        {phase === "challenge" && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
            <Eye className="size-5" />
            <span className="font-bold">{instruksi}</span>
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

      {msg && (
        <p className={`text-center text-sm ${phase === "error" || phase === "gagal" ? "text-danger" : "text-muted"}`}>
          {msg}
        </p>
      )}

      {(phase === "gagal" || phase === "error") && (
        <button
          onClick={() => (phase === "error" ? window.location.reload() : startChallenge())}
          className="pressable flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-bold text-brand-fg"
        >
          <RefreshCw className="size-5" /> Coba lagi
        </button>
      )}
      {phase === "challenge" && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted">
          <ScanFace className="size-4" /> Ikuti instruksi di layar untuk membuktikan wajah asli
        </div>
      )}
    </div>
  );
}
