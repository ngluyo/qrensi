import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { HARI, pendekHari } from "@/lib/hari";
import { createPola, deletePola } from "../actions";
import { Trash2, Plus } from "lucide-react";

export default async function PolaHariKerjaPage() {
  const user = await requireAdmin();
  const db = createAdminClient();
  const { data: pola } = await db
    .from("pola_hari_kerja")
    .select("id, nama, hari_aktif")
    .eq("instansi_id", user.instansiId)
    .order("nama");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Pola Hari Kerja</h1>
        <p className="mt-1 text-sm text-muted">
          Tentukan hari kerja aktif per pola. Pegawai ditugaskan ke salah satu pola.
        </p>
      </header>

      {/* Daftar pola */}
      <div className="space-y-3">
        {(pola ?? []).map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="min-w-0">
              <div className="font-bold">{p.nama}</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {[...(p.hari_aktif as number[])]
                  .sort((a, b) => (a === 1 ? 8 : a) - (b === 1 ? 8 : b))
                  .map((h) => (
                    <span
                      key={h}
                      className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand"
                    >
                      {pendekHari(h)}
                    </span>
                  ))}
              </div>
            </div>
            <form action={deletePola}>
              <input type="hidden" name="id" value={p.id} />
              <button
                className="pressable grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                aria-label={`Hapus ${p.nama}`}
              >
                <Trash2 className="size-4" />
              </button>
            </form>
          </div>
        ))}
        {(pola ?? []).length === 0 && (
          <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
            Belum ada pola. Tambahkan di bawah.
          </p>
        )}
      </div>

      {/* Form tambah */}
      <form
        action={createPola}
        className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]"
      >
        <div className="text-sm font-bold">Tambah pola</div>
        <div className="space-y-1.5">
          <label htmlFor="nama" className="text-sm font-semibold">Nama pola</label>
          <input
            id="nama"
            name="nama"
            required
            placeholder="mis. Senin-Jumat"
            className="w-full rounded-xl border border-border bg-bg px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-semibold">Hari aktif</span>
          <div className="flex flex-wrap gap-2">
            {HARI.map((h) => (
              <label
                key={h.v}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand"
              >
                <input type="checkbox" name="hari" value={h.v} className="accent-brand" />
                {h.pendek}
              </label>
            ))}
          </div>
        </div>
        <button className="pressable flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg">
          <Plus className="size-4" /> Tambah pola
        </button>
      </form>
    </div>
  );
}
