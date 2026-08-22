"use client";

import { useState } from "react";
import { createPegawai, createUnit } from "../actions";
import { UserPlus, Plus, Building2, ChevronDown } from "lucide-react";

interface Opt { id: string; nama: string }

export function TambahPegawai({ units, pola }: { units: Opt[]; pola: Opt[] }) {
  const [buka, setBuka] = useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setBuka((v) => !v)}
        className="pressable flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 font-bold text-brand-fg"
      >
        <UserPlus className="size-5" /> Tambah pegawai
        <ChevronDown className={`size-4 transition ${buka ? "rotate-180" : ""}`} />
      </button>

      {buka && (
        <>
          <form action={createPegawai} className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama" name="nama" required placeholder="Nama lengkap" />
              <Field label="NIP" name="nip" placeholder="Opsional" />
              <Field label="Jabatan" name="jabatan" placeholder="Opsional" />
              <Select label="Unit kerja" name="unit_kerja_id" required options={units} />
              <Select label="Pola hari kerja" name="pola_hari_kerja_id" required options={pola} />
            </div>
            <button className="pressable flex items-center gap-2 rounded-xl bg-text px-5 py-2.5 font-bold text-bg">
              <Plus className="size-4" /> Simpan pegawai
            </button>
          </form>

          <form action={createUnit} className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
            <div className="flex-1">
              <label htmlFor="unit-nama" className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted">
                <Building2 className="size-3.5" /> Tambah unit kerja baru
              </label>
              <input
                id="unit-nama"
                name="nama"
                required
                placeholder="mis. Dinas Kominfo"
                className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
            </div>
            <button className="pressable rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-bold">Tambah unit</button>
          </form>
        </>
      )}
    </div>
  );
}

function Field({ label, name, required, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
      />
    </label>
  );
}

function Select({ label, name, required, options }: { label: string; name: string; required?: boolean; options: Opt[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
      >
        <option value="" disabled>Pilih…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.nama}</option>
        ))}
      </select>
    </label>
  );
}
