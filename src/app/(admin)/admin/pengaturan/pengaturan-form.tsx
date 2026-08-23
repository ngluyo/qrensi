"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { simpanPengaturan, simpanLogo, hapusLogo, type PengaturanState } from "./actions";
import type { Pengaturan } from "@/lib/pengaturan";
import { Save, Loader2, CheckCircle2, AlertCircle, ImageUp, Trash2, Palette } from "lucide-react";

const init: PengaturanState = { ok: false };

const ZONA = [
  { v: "Asia/Jakarta", l: "WIB — Asia/Jakarta" },
  { v: "Asia/Makassar", l: "WITA — Asia/Makassar" },
  { v: "Asia/Jayapura", l: "WIT — Asia/Jayapura" },
];

export function PengaturanForm({ awal, logoUrl }: { awal: Pengaturan; logoUrl: string | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(simpanPengaturan, init);
  const [logoState, logoAction, logoPending] = useActionState(simpanLogo, init);
  const [, hapusAction, hapusPending] = useActionState(hapusLogo, init);

  const [warna, setWarna] = useState(awal.warnaBrand);
  const [nama, setNama] = useState(awal.namaAplikasi);
  const logoInput = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Pengaturan Aplikasi</h1>
        <p className="mt-1 text-sm text-muted">
          Identitas aplikasi (white-label). Ubah di sini untuk menyesuaikan dengan instansi,
          perusahaan, sekolah, atau organisasi Anda — tanpa menyentuh kode.
        </p>
      </header>

      {/* Pratinjau */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <div className="mb-3 text-xs font-bold text-muted">Pratinjau</div>
        <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: warna }}>
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/20 font-extrabold text-white">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="size-full object-contain p-1" />
            ) : (
              awal.singkatan
            )}
          </span>
          <div className="min-w-0 text-white">
            <div className="truncate text-lg font-extrabold">{nama || "Nama Aplikasi"}</div>
            <div className="truncate text-xs opacity-80">{awal.namaOrganisasi}</div>
          </div>
        </div>
      </div>

      {/* Logo */}
      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-bold">Logo</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-lg font-bold text-muted">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo saat ini" className="size-full object-contain p-1" />
            ) : (
              awal.singkatan
            )}
          </span>
          <form action={logoAction} className="flex flex-wrap items-center gap-2">
            <input
              ref={logoInput}
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => logoInput.current?.click()}
              disabled={logoPending}
              className="pressable flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-fg disabled:opacity-60"
            >
              {logoPending ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
              {logoUrl ? "Ganti logo" : "Unggah logo"}
            </button>
          </form>
          {logoUrl && (
            <form action={hapusAction}>
              <button
                disabled={hapusPending}
                className="pressable flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-semibold text-danger disabled:opacity-60"
              >
                <Trash2 className="size-4" /> Hapus
              </button>
            </form>
          )}
        </div>
        <p className="text-xs text-muted">PNG/JPG/WebP/SVG, maks 1MB. Disarankan bujur sangkar & latar transparan.</p>
        {logoState.message && (
          <p className={`text-sm font-medium ${logoState.ok ? "text-success" : "text-danger"}`}>{logoState.message}</p>
        )}
      </section>

      {/* Identitas */}
      <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-bold">Identitas</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Nama aplikasi *</span>
            <input
              name="nama_aplikasi"
              required
              defaultValue={awal.namaAplikasi}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Presensi ASN Kotabaru"
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Singkatan (fallback logo)</span>
            <input
              name="singkatan"
              maxLength={4}
              defaultValue={awal.singkatan}
              placeholder="mis. QR"
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted">Nama organisasi *</span>
            <input
              name="nama_organisasi"
              required
              defaultValue={awal.namaOrganisasi}
              placeholder="mis. Pemerintah Kabupaten Kotabaru / PT Maju Jaya / SMAN 1"
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted">Tagline</span>
            <input
              name="tagline"
              defaultValue={awal.tagline}
              placeholder="Kalimat singkat di halaman awal"
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Warna brand *</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={warna}
                onChange={(e) => setWarna(e.target.value)}
                aria-label="Pilih warna"
                className="size-11 shrink-0 cursor-pointer rounded-xl border border-border bg-bg p-1"
              />
              <input
                name="warna_brand"
                value={warna}
                onChange={(e) => setWarna(e.target.value)}
                pattern="#[0-9a-fA-F]{6}"
                required
                className="tabular w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Zona waktu *</span>
            <select
              name="timezone"
              defaultValue={awal.timezone}
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            >
              {ZONA.map((z) => (
                <option key={z.v} value={z.v}>{z.l}</option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted">Kontak bantuan (tampil ke pegawai)</span>
            <input
              name="kontak_bantuan"
              defaultValue={awal.kontakBantuan ?? ""}
              placeholder="mis. Bagian Kepegawaian — 0812xxxx"
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </label>
        </div>

        {state.message && (
          <p className={`flex items-center gap-1.5 text-sm font-medium ${state.ok ? "text-success" : "text-danger"}`}>
            {state.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
            {state.message}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            disabled={pending}
            className="pressable flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />} Simpan
          </button>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="pressable flex items-center gap-2 rounded-xl bg-surface-2 px-5 py-3 font-semibold"
          >
            <Palette className="size-4" /> Muat ulang pratinjau
          </button>
        </div>
        <p className="text-xs text-muted">
          Perubahan berlaku ke seluruh aplikasi: halaman awal, login, kiosk, judul tab, dan ikon PWA.
        </p>
      </form>
    </div>
  );
}
