import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { createPegawai, deletePegawai, createUnit } from "../actions";
import { Trash2, UserPlus, Building2, Plus } from "lucide-react";

interface PegawaiRow {
  id: string;
  nama: string;
  nip: string | null;
  jabatan: string | null;
  status_kepegawaian: string;
  unit_kerja: { nama: string } | null;
  pola_hari_kerja: { nama: string } | null;
}

export default async function PegawaiPage() {
  const user = await requireAdmin();
  const db = createAdminClient();

  const [{ data: pegawai }, { data: units }, { data: pola }] = await Promise.all([
    db
      .from("pegawai")
      .select("id, nama, nip, jabatan, status_kepegawaian, unit_kerja(nama), pola_hari_kerja(nama)")
      .eq("instansi_id", user.instansiId)
      .order("nama"),
    db.from("unit_kerja").select("id, nama").eq("instansi_id", user.instansiId).order("nama"),
    db.from("pola_hari_kerja").select("id, nama").eq("instansi_id", user.instansiId).order("nama"),
  ]);

  const list = (pegawai ?? []) as unknown as PegawaiRow[];
  const unitList = units ?? [];
  const polaList = pola ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Pegawai</h1>
        <p className="mt-1 text-sm text-muted">Kelola data pegawai &amp; penugasan pola hari kerja.</p>
      </header>

      {/* Daftar pegawai */}
      <div className="space-y-2">
        {list.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-sm)]"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand">
              {p.nama.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{p.nama}</div>
              <div className="tabular truncate text-xs text-muted">
                {p.nip ? `${p.nip} · ` : ""}
                {p.unit_kerja?.nama ?? "—"} · {p.pola_hari_kerja?.nama ?? "—"}
              </div>
            </div>
            {p.status_kepegawaian !== "aktif" && (
              <span className="rounded-md bg-warning-soft px-2 py-0.5 text-[11px] font-semibold capitalize text-warning">
                {p.status_kepegawaian}
              </span>
            )}
            <form action={deletePegawai}>
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
        {list.length === 0 && (
          <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
            Belum ada pegawai.
          </p>
        )}
      </div>

      {/* Tambah pegawai */}
      <form
        action={createPegawai}
        className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]"
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <UserPlus className="size-4" /> Tambah pegawai
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama" name="nama" required placeholder="Nama lengkap" />
          <Field label="NIP" name="nip" placeholder="Opsional" />
          <Field label="Jabatan" name="jabatan" placeholder="Opsional" />
          <Select label="Unit kerja" name="unit_kerja_id" required options={unitList} />
          <Select label="Pola hari kerja" name="pola_hari_kerja_id" required options={polaList} />
        </div>
        <button className="pressable flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg">
          <Plus className="size-4" /> Tambah
        </button>
      </form>

      {/* Tambah unit kerja */}
      <form
        action={createUnit}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]"
      >
        <div className="flex-1">
          <label htmlFor="unit-nama" className="mb-1 flex items-center gap-2 text-sm font-bold">
            <Building2 className="size-4" /> Tambah unit kerja
          </label>
          <input
            id="unit-nama"
            name="nama"
            required
            placeholder="mis. Dinas Kominfo"
            className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>
        <button className="pressable rounded-xl bg-text px-5 py-2.5 font-bold text-bg">Tambah unit</button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
      />
    </label>
  );
}

function Select({
  label,
  name,
  required,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  options: { id: string; nama: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
      >
        <option value="" disabled>
          Pilih…
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nama}
          </option>
        ))}
      </select>
    </label>
  );
}
