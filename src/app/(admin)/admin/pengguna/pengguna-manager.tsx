"use client";

import { useActionState, useState } from "react";
import { tunjukAdmin, cabutAdmin, type PenggunaState } from "./actions";
import { ShieldCheck, ShieldPlus, UserMinus, CheckCircle2, AlertCircle, Info } from "lucide-react";

interface Opt { id: string; nama: string }
interface AdminRow { id: string; peran: string; nama: string; unit: string; isSelf: boolean }
interface Kandidat { id: string; nama: string; nip: string | null; punyaAkun: boolean; unit: string | null }

const init: PenggunaState = { ok: false };

export function PenggunaManager({
  daftarAdmin,
  kandidat,
  units,
  jumlahSuper,
}: {
  daftarAdmin: AdminRow[];
  kandidat: Kandidat[];
  units: Opt[];
  jumlahSuper: number;
}) {
  const [state, action, pending] = useActionState(tunjukAdmin, init);
  const [peran, setPeran] = useState("admin_unit");

  const bisaJadiAdmin = kandidat.filter((k) => k.punyaAkun);
  const tanpaAkun = kandidat.length - bisaJadiAdmin.length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Pengguna &amp; Peran</h1>
        <p className="mt-1 text-sm text-muted">
          Tunjuk Admin OPD agar pengelolaan pegawai &amp; enrollment wajah tidak menumpuk di BKPSDM.
        </p>
      </header>

      {/* Penjelasan peran */}
      <div className="space-y-2 rounded-2xl bg-info-soft p-4 text-xs text-info">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Info className="size-4" /> Kewenangan
        </div>
        <p><strong>Super Admin (BKPSDM):</strong> semua unit + jam kerja, potongan, ekspor, kelola peran.</p>
        <p><strong>Admin OPD:</strong> hanya unitnya — kelola pegawai, buat/reset akun, <strong>enrollment wajah</strong>, kiosk, approve izin.</p>
      </div>

      {/* Daftar admin */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-muted">Admin terdaftar ({daftarAdmin.length})</h2>
        {daftarAdmin.map((a) => {
          const superTerakhir = a.peran === "super_admin" && jumlahSuper <= 1;
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-sm)]">
              <div
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  a.peran === "super_admin" ? "bg-brand text-brand-fg" : "bg-brand-soft text-brand"
                }`}
              >
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {a.nama} {a.isSelf && <span className="text-xs font-normal text-muted">(Anda)</span>}
                </div>
                <div className="truncate text-xs text-muted">
                  {a.peran === "super_admin" ? "Super Admin · semua unit" : `Admin OPD · ${a.unit}`}
                </div>
              </div>
              {!superTerakhir && (
                <form action={cabutAdmin}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    className="pressable grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                    aria-label={`Cabut peran ${a.nama}`}
                    title="Cabut peran"
                  >
                    <UserMinus className="size-4" />
                  </button>
                </form>
              )}
            </div>
          );
        })}
        {daftarAdmin.length === 0 && (
          <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
            Belum ada admin terdaftar.
          </p>
        )}
        {jumlahSuper <= 1 && (
          <p className="text-xs text-muted">
            Super Admin terakhir tidak bisa dicabut agar sistem tidak terkunci.
          </p>
        )}
      </section>

      {/* Tunjuk admin baru */}
      <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 text-sm font-bold">
          <ShieldPlus className="size-4" /> Tunjuk admin baru
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Pegawai (harus sudah punya akun)</span>
          <select name="pegawai_id" required defaultValue="" className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25">
            <option value="" disabled>Pilih…</option>
            {bisaJadiAdmin.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}{k.unit ? ` — ${k.unit}` : ""}
              </option>
            ))}
          </select>
          {tanpaAkun > 0 && (
            <span className="mt-1 block text-[11px] text-muted">
              {tanpaAkun} pegawai belum punya akun login sehingga tidak bisa dijadikan admin.
            </span>
          )}
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Peran</span>
            <select
              name="peran"
              value={peran}
              onChange={(e) => setPeran(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            >
              <option value="admin_unit">Admin OPD (unit tertentu)</option>
              <option value="super_admin">Super Admin (semua unit)</option>
            </select>
          </label>

          {peran === "admin_unit" && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Unit kerja yang diampu</span>
              <select name="unit_kerja_id" defaultValue="" className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25">
                <option value="">(pakai unit asal pegawai)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.nama}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {state.message && (
          <p className={`flex items-center gap-1.5 text-sm font-medium ${state.ok ? "text-success" : "text-danger"}`}>
            {state.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
            {state.message}
          </p>
        )}

        <button disabled={pending || bisaJadiAdmin.length === 0} className="pressable flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg disabled:opacity-50">
          <ShieldPlus className="size-4" /> Tetapkan sebagai admin
        </button>
        <p className="text-xs text-muted">
          Satu pegawai bisa mengampu beberapa unit — tunjuk berulang dengan unit berbeda.
        </p>
      </form>
    </div>
  );
}
