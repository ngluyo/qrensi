import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { createPotongan, deletePotongan } from "../actions";
import { Trash2, Plus } from "lucide-react";

interface Aturan {
  id: string;
  jenis: string;
  menit_dari: number;
  menit_sampai: number | null;
  persen_potongan: number;
}

const JENIS_LABEL: Record<string, string> = {
  terlambat: "Terlambat",
  pulang_cepat: "Pulang cepat",
  tidak_hadir: "Tidak hadir (alpa)",
};

export default async function PotonganPage() {
  const user = await requireSuperAdmin();
  const db = createAdminClient();
  const { data } = await db
    .from("pengaturan_potongan")
    .select("id, jenis, menit_dari, menit_sampai, persen_potongan")
    .eq("instansi_id", user.instansiId)
    .order("jenis")
    .order("menit_dari");
  const aturan = (data ?? []) as Aturan[];

  const grup = ["terlambat", "pulang_cepat", "tidak_hadir"].map((j) => ({
    jenis: j,
    rows: aturan.filter((a) => a.jenis === j),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Aturan Potongan</h1>
        <p className="mt-1 text-sm text-muted">
          Berjenjang per rentang menit. Sistem menghasilkan <strong>persentase</strong>; nominal
          dihitung bagian keuangan.
        </p>
      </header>

      {grup.map((g) => (
        <div key={g.jenis} className="space-y-2">
          <h2 className="text-sm font-bold text-muted">{JENIS_LABEL[g.jenis]}</h2>
          <div className="space-y-2">
            {g.rows.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-sm)]"
              >
                <div className="tabular text-sm">
                  <span className="font-semibold">
                    {a.menit_dari}
                    {a.menit_sampai !== null ? `–${a.menit_sampai}` : "+"} menit
                  </span>
                  <span className="ml-2 rounded-md bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
                    {a.persen_potongan}%
                  </span>
                </div>
                <form action={deletePotongan}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="pressable grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            ))}
            {g.rows.length === 0 && (
              <p className="rounded-xl bg-surface p-3 text-center text-xs text-muted shadow-[var(--shadow-sm)]">
                Belum ada aturan.
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Tambah aturan */}
      <form
        action={createPotongan}
        className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]"
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <Plus className="size-4" /> Tambah aturan
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="col-span-2 block sm:col-span-1">
            <span className="mb-1 block text-xs font-semibold text-muted">Jenis</span>
            <select
              name="jenis"
              defaultValue="terlambat"
              className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            >
              <option value="terlambat">Terlambat</option>
              <option value="pulang_cepat">Pulang cepat</option>
              <option value="tidak_hadir">Tidak hadir</option>
            </select>
          </label>
          <NumField label="Menit dari" name="menit_dari" placeholder="1" />
          <NumField label="Menit sampai" name="menit_sampai" placeholder="kosong = ∞" />
          <NumField label="Persen (%)" name="persen_potongan" placeholder="0.5" step="0.01" />
        </div>
        <button className="pressable flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg">
          <Plus className="size-4" /> Tambah
        </button>
      </form>
    </div>
  );
}

function NumField({
  label,
  name,
  placeholder,
  step,
}: {
  label: string;
  name: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input
        name={name}
        type="number"
        step={step}
        inputMode="decimal"
        placeholder={placeholder}
        className="tabular w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
      />
    </label>
  );
}
