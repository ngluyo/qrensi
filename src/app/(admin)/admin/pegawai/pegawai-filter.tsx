"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface Opt { id: string; nama: string }

export function PegawaiFilter({
  units,
  q,
  unit,
  status,
  akun,
}: {
  units: Opt[];
  q: string;
  unit: string;
  status: string;
  akun: string;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState(q);

  const aktif = [unit, status, akun].filter(Boolean).length;

  function terapkan(next: Partial<{ q: string; unit: string; status: string; akun: string }>) {
    const p = new URLSearchParams();
    const nq = next.q ?? cari;
    const nu = next.unit ?? unit;
    const ns = next.status ?? status;
    const na = next.akun ?? akun;
    if (nq) p.set("q", nq);
    if (nu) p.set("unit", nu);
    if (ns) p.set("status", ns);
    if (na) p.set("akun", na);
    router.push(`/admin/pegawai${p.toString() ? `?${p}` : ""}`);
    setBuka(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            terapkan({});
          }}
          className="relative flex-1"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama atau NIP…"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </form>
        <button
          onClick={() => setBuka((v) => !v)}
          className="pressable relative flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-semibold"
        >
          <SlidersHorizontal className="size-4" />
          Filter
          {aktif > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-fg">
              {aktif}
            </span>
          )}
        </button>
      </div>

      {buka && (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
          <Baris label="Unit kerja">
            <Pilih
              value={unit}
              onChange={(v) => terapkan({ unit: v })}
              options={[{ id: "", nama: "Semua unit" }, ...units]}
            />
          </Baris>
          <Baris label="Status kepegawaian">
            <Pilih
              value={status}
              onChange={(v) => terapkan({ status: v })}
              options={[
                { id: "", nama: "Semua status" },
                { id: "aktif", nama: "Aktif" },
                { id: "cuti", nama: "Cuti" },
                { id: "nonaktif", nama: "Nonaktif" },
              ]}
            />
          </Baris>
          <Baris label="Akun login">
            <Pilih
              value={akun}
              onChange={(v) => terapkan({ akun: v })}
              options={[
                { id: "", nama: "Semua" },
                { id: "ada", nama: "Sudah punya akun" },
                { id: "belum", nama: "Belum punya akun" },
              ]}
            />
          </Baris>
          {aktif > 0 && (
            <button
              onClick={() => {
                setCari("");
                router.push("/admin/pegawai");
                setBuka(false);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-danger"
            >
              <X className="size-3.5" /> Hapus semua filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

function Pilih({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.nama}</option>
      ))}
    </select>
  );
}
