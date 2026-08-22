"use client";

import { useActionState } from "react";
import { simpanDataPribadi, type ProfilState } from "./actions";
import { Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const init: ProfilState = { ok: false };

export function EditProfilForm({
  awal,
}: {
  awal: { no_hp: string; email_kontak: string; alamat: string };
}) {
  const [state, action, pending] = useActionState(simpanDataPribadi, init);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
      <h2 className="text-sm font-bold">Data pribadi</h2>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted">Nomor HP</span>
        <input
          name="no_hp"
          defaultValue={awal.no_hp}
          inputMode="tel"
          placeholder="0812xxxxxxx"
          className="tabular w-full rounded-xl border border-border bg-bg px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted">Email kontak</span>
        <input
          name="email_kontak"
          type="email"
          defaultValue={awal.email_kontak}
          placeholder="nama@email.com"
          className="w-full rounded-xl border border-border bg-bg px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted">Alamat</span>
        <textarea
          name="alamat"
          defaultValue={awal.alamat}
          rows={3}
          placeholder="Alamat tempat tinggal"
          className="w-full resize-none rounded-xl border border-border bg-bg px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </label>

      {state.message && (
        <p className={`flex items-center gap-1.5 text-sm font-medium ${state.ok ? "text-success" : "text-danger"}`}>
          {state.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
          {state.message}
        </p>
      )}

      <button
        disabled={pending}
        className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-bold text-brand-fg disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
        Simpan
      </button>
    </form>
  );
}
