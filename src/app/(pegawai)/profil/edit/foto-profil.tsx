"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { simpanFotoProfil, hapusFotoProfil } from "./actions";
import { Camera, Loader2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

/** Kecilkan gambar di browser → WebP maks 512px agar hemat kuota storage. */
async function kecilkan(file: File, maks = 512): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const skala = Math.min(1, maks / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * skala);
  const h = Math.round(bitmap.height * skala);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.85));
  if (!blob) return file;
  return new File([blob], "foto.webp", { type: "image/webp" });
}

export function FotoProfil({ nama, src }: { nama: string; src: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(src);
  const [pending, setPending] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPesan(null);
    setPending(true);
    try {
      const kecil = await kecilkan(file);
      setPreview(URL.createObjectURL(kecil));
      const fd = new FormData();
      fd.set("foto", kecil);
      const hasil = await simpanFotoProfil({ ok: false }, fd);
      setPesan({ ok: hasil.ok, teks: hasil.message ?? "" });
      if (hasil.ok) router.refresh();
    } catch {
      setPesan({ ok: false, teks: "Gagal memproses gambar." });
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function hapus() {
    setPending(true);
    const hasil = await hapusFotoProfil({ ok: false }, new FormData());
    setPreview(null);
    setPesan({ ok: hasil.ok, teks: hasil.message ?? "" });
    setPending(false);
    router.refresh();
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
      <h2 className="text-sm font-bold">Foto profil</h2>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar nama={nama} src={preview} size={72} />
          {pending && (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white">
              <Loader2 className="size-5 animate-spin" />
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="pressable flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-fg disabled:opacity-60"
          >
            <Camera className="size-4" /> {preview ? "Ganti foto" : "Unggah foto"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={hapus}
              disabled={pending}
              className="pressable flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-semibold text-danger disabled:opacity-60"
            >
              <Trash2 className="size-4" /> Hapus
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={pilih}
        className="hidden"
        aria-label="Pilih foto profil"
      />

      {pesan && (
        <p className={`flex items-center gap-1.5 text-sm font-medium ${pesan.ok ? "text-success" : "text-danger"}`}>
          {pesan.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
          {pesan.teks}
        </p>
      )}

      <p className="text-xs text-muted">
        Foto ini hanya untuk tampilan aplikasi dan <strong>berbeda</strong> dari foto verifikasi
        wajah. Gambar dikecilkan otomatis agar hemat kuota.
      </p>
    </section>
  );
}
