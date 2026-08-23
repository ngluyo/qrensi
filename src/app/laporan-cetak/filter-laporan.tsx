"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";

/** Filter periode & unit untuk laporan cetak (MASTERPLAN 5.3). */
export function FilterLaporan({
  units,
  dari,
  sampai,
  unit,
}: {
  units: { id: string; nama: string }[];
  dari: string;
  sampai: string;
  unit: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function ubah(kunci: string, nilai: string) {
    const p = new URLSearchParams(sp.toString());
    if (nilai) p.set(kunci, nilai);
    else p.delete(kunci);
    router.push(`/laporan-cetak?${p.toString()}`);
  }

  function pintasBulan(offset: number) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const akhir = new Date(y, d.getMonth() + 1, 0).getDate();
    const p = new URLSearchParams(sp.toString());
    p.set("dari", `${y}-${m}-01`);
    p.set("sampai", `${y}-${m}-${String(akhir).padStart(2, "0")}`);
    router.push(`/laporan-cetak?${p.toString()}`);
  }

  const inputCls =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500";

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <Filter className="size-4" /> Filter laporan
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Dari tanggal</span>
          <input type="date" value={dari} onChange={(e) => ubah("dari", e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Sampai tanggal</span>
          <input type="date" value={sampai} onChange={(e) => ubah("sampai", e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Unit kerja</span>
          <select value={unit} onChange={(e) => ubah("unit", e.target.value)} className={inputCls}>
            <option value="">Semua unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.nama}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => router.push("/laporan-cetak")}
          className="flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <RotateCcw className="size-3.5" /> Reset
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="self-center text-xs text-slate-500">Pintasan:</span>
        {[
          { l: "Bulan ini", o: 0 },
          { l: "Bulan lalu", o: -1 },
          { l: "2 bulan lalu", o: -2 },
        ].map((b) => (
          <button
            key={b.l}
            onClick={() => pintasBulan(b.o)}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300"
          >
            {b.l}
          </button>
        ))}
      </div>
    </div>
  );
}
