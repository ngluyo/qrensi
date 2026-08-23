"use client";

import { useActionState } from "react";
import Link from "next/link";
import { jalankanSetup, type SetupState } from "./actions";
import { PasswordInput } from "@/components/ui/password-input";
import { Rocket, Loader2, AlertCircle, CheckCircle2, Building2, UserCog } from "lucide-react";

const init: SetupState = { ok: false };

const ZONA = [
  { v: "Asia/Jakarta", l: "WIB — Jakarta, Sumatera, Jawa Barat" },
  { v: "Asia/Makassar", l: "WITA — Kalimantan, Sulawesi, Bali, NTB" },
  { v: "Asia/Jayapura", l: "WIT — Maluku, Papua" },
];

export function SetupWizard() {
  const [state, action, pending] = useActionState(jalankanSetup, init);

  if (state.selesai) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-success text-white">
            <CheckCircle2 className="size-9" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Setup selesai</h1>
          <p className="mt-2 text-sm text-muted">
            Akun administrator berhasil dibuat untuk <strong>{state.email}</strong>.
            Silakan masuk dan lanjutkan konfigurasi jam kerja serta data pegawai.
          </p>
          <Link
            href="/login"
            className="pressable mt-6 inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 font-bold text-brand-fg"
          >
            Masuk sekarang
          </Link>
        </div>
      </main>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25";

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-brand text-brand-fg">
            <Rocket className="size-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Selamat datang</h1>
          <p className="mt-1 text-sm text-muted">
            Aplikasi belum dikonfigurasi. Isi formulir singkat ini untuk membuat akun
            administrator pertama.
          </p>
        </header>

        <form action={action} className="space-y-5">
          {/* Organisasi */}
          <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Building2 className="size-4" /> Identitas organisasi
            </h2>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Nama organisasi *</span>
              <input
                name="nama_organisasi"
                required
                placeholder="mis. Pemerintah Kabupaten X / PT Maju Jaya / SMAN 1"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Nama aplikasi</span>
              <input name="nama_aplikasi" defaultValue="QRensi" className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Zona waktu *</span>
              <select name="timezone" defaultValue="Asia/Makassar" className={inputCls}>
                {ZONA.map((z) => (
                  <option key={z.v} value={z.v}>{z.l}</option>
                ))}
              </select>
            </label>
          </section>

          {/* Admin */}
          <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <UserCog className="size-4" /> Akun administrator
            </h2>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Nama lengkap *</span>
              <input name="nama_admin" required placeholder="Nama Anda" className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Email *</span>
              <input
                name="email"
                type="email"
                required
                placeholder="admin@organisasi.go.id"
                className={inputCls}
              />
            </label>
            <PasswordInput
              name="sandi"
              label="Kata sandi *"
              placeholder="minimal 8 karakter"
              autoComplete="new-password"
              required
            />
            <PasswordInput
              name="sandi2"
              label="Ulangi kata sandi *"
              placeholder="ketik ulang"
              autoComplete="new-password"
              required
            />
          </section>

          {state.message && !state.ok && (
            <p className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.message}
            </p>
          )}

          <button
            disabled={pending}
            className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-bold text-brand-fg disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : <Rocket className="size-5" />}
            Buat akun &amp; mulai
          </button>

          <p className="text-center text-xs text-muted">
            Halaman ini otomatis tertutup setelah administrator pertama dibuat.
          </p>
        </form>
      </div>
    </main>
  );
}
