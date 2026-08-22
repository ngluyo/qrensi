"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadFaceModels, getDescriptor, requestCamera, pesanErrorKamera } from "@/lib/face";
import { ScanFace, Check, Loader2, Camera } from "lucide-react";

interface Pegawai {
  id: string;
  nama: string;
  nip: string | null;
  enrolled: boolean;
}

type Phase = "idle" | "loading-model" | "ready" | "capturing" | "saving" | "done" | "error";

export function EnrollmentClient({ pegawai, preselect = "" }: { pegawai: Pegawai[]; preselect?: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [pegawaiId, setPegawaiId] = useState(preselect);
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startCamera() {
    // 1) Minta kamera DULU agar prompt izin pasti muncul (ADR-0020).
    setPhase("loading-model");
    setMsg("Meminta izin kamera…");
    let stream: MediaStream;
    try {
      stream = await requestCamera("user");
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
    setMsg("Memuat model wajah…");
    try {
      await loadFaceModels();
      setPhase("ready");
      setMsg("");
    } catch (e) {
      setPhase("error");
      setMsg("Model wajah gagal dimuat: " + ((e as Error)?.message ?? "tidak diketahui"));
    }
  }

  async function capture() {
    if (!videoRef.current || !pegawaiId) return;
    setPhase("capturing");
    setMsg("Mendeteksi wajah…");
    const desc = await getDescriptor(videoRef.current);
    if (!desc) {
      setPhase("ready");
      setMsg("Wajah tidak terdeteksi. Posisikan wajah di tengah, cahaya cukup.");
      return;
    }
    setPhase("saving");
    setMsg("Menyimpan…");
    const res = await fetch("/api/face/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pegawai_id: pegawaiId, descriptor: desc }),
    });
    const data = await res.json();
    if (data.ok) {
      setPhase("done");
      setMsg("Enrollment berhasil disimpan.");
      router.refresh();
    } else {
      setPhase("ready");
      setMsg("Gagal menyimpan: " + (data.error ?? "unknown"));
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Enrollment Wajah</h1>
        <p className="mt-1 text-sm text-muted">
          Daftarkan wajah pegawai (didampingi HR). Descriptor dihitung di perangkat ini, keputusan
          kecocokan di server.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Pilih pegawai</span>
          <select
            value={pegawaiId}
            onChange={(e) => setPegawaiId(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          >
            <option value="">Pilih…</option>
            {pegawai.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} {p.enrolled ? "✓ (sudah)" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} playsInline muted className="size-full object-cover" />
          {phase === "idle" && (
            <div className="absolute inset-0 grid place-items-center text-white/70">
              <ScanFace className="size-12" />
            </div>
          )}
          {(phase === "loading-model" || phase === "capturing" || phase === "saving") && (
            <div className="absolute inset-0 grid place-items-center bg-black/50 text-white">
              <Loader2 className="size-8 animate-spin" />
            </div>
          )}
        </div>

        {msg && (
          <p className={`text-sm ${phase === "error" ? "text-danger" : phase === "done" ? "text-success" : "text-muted"}`}>
            {msg}
          </p>
        )}

        <div className="flex gap-3">
          {phase === "idle" || phase === "error" ? (
            <button onClick={startCamera} className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 py-3 font-bold">
              <Camera className="size-4" /> Nyalakan kamera
            </button>
          ) : (
            <button
              onClick={capture}
              disabled={!pegawaiId || phase === "capturing" || phase === "saving"}
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-3 font-bold text-brand-fg disabled:opacity-50"
            >
              {phase === "done" ? <Check className="size-4" /> : <ScanFace className="size-4" />}
              {phase === "done" ? "Simpan lagi" : "Ambil & simpan wajah"}
            </button>
          )}
        </div>
      </div>

      {/* Daftar status */}
      <div>
        <h2 className="mb-2 text-sm font-bold text-muted">Status enrollment</h2>
        <div className="space-y-2">
          {pegawai.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-surface p-3 shadow-[var(--shadow-sm)]">
              <span className="text-sm font-medium">{p.nama}</span>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  p.enrolled ? "bg-success-soft text-success" : "bg-surface-2 text-muted"
                }`}
              >
                {p.enrolled ? "Terdaftar" : "Belum"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
