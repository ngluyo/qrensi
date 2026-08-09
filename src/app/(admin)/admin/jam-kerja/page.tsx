import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { namaHari } from "@/lib/hari";
import { updateJamSesi } from "../actions";
import { Save, Clock } from "lucide-react";

const JENIS_LABEL: Record<string, string> = {
  masuk: "Masuk",
  istirahat: "Istirahat",
  pulang: "Pulang",
};

function hhmm(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

type SP = { [k: string]: string | string[] | undefined };

interface SesiRow {
  id: string;
  hari: number;
  jenis_sesi: string;
  jam_buka: string | null;
  jam_tutup: string | null;
  jam_batas_akhir: string | null;
  jam_wajar_akhir: string | null;
  urutan: number;
  aktif: boolean;
}

export default async function JamKerjaPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const db = createAdminClient();

  const { data: polaList } = await db
    .from("pola_hari_kerja")
    .select("id, nama")
    .eq("instansi_id", user.instansiId)
    .order("nama");

  const selectedPola = (sp.pola as string) || polaList?.[0]?.id;

  let sesi: SesiRow[] = [];
  if (selectedPola) {
    const { data } = await db
      .from("jam_kerja_sesi")
      .select("id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, jam_wajar_akhir, urutan, aktif")
      .eq("pola_hari_kerja_id", selectedPola)
      .order("hari")
      .order("urutan");
    sesi = (data ?? []) as SesiRow[];
  }

  // Kelompokkan per hari (urut Senin dulu)
  const byHari = new Map<number, SesiRow[]>();
  for (const s of sesi) {
    if (!byHari.has(s.hari)) byHari.set(s.hari, []);
    byHari.get(s.hari)!.push(s);
  }
  const hariUrut = [...byHari.keys()].sort((a, b) => (a === 1 ? 8 : a) - (b === 1 ? 8 : b));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Jam Kerja Sesi</h1>
        <p className="mt-1 text-sm text-muted">
          Atur jam buka/tutup tiap sesi per hari. Perubahan berlaku ke depan (tidak retroaktif).
        </p>
      </header>

      {/* Pemilih pola */}
      <div className="flex flex-wrap gap-2">
        {(polaList ?? []).map((p) => {
          const active = p.id === selectedPola;
          return (
            <Link
              key={p.id}
              href={`/admin/jam-kerja?pola=${p.id}`}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-brand text-brand-fg shadow-[var(--shadow-sm)]"
                  : "border border-border bg-surface text-muted"
              }`}
            >
              {p.nama}
            </Link>
          );
        })}
      </div>

      {/* Sesi per hari */}
      <div className="space-y-6">
        {hariUrut.map((hari) => (
          <div key={hari} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-muted">
              <Clock className="size-4" /> {namaHari(hari)}
            </h2>
            <div className="space-y-3">
              {byHari.get(hari)!.map((s) => (
                <form
                  key={s.id}
                  action={updateJamSesi}
                  className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]"
                >
                  <input type="hidden" name="id" value={s.id} />
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand">
                      {JENIS_LABEL[s.jenis_sesi] ?? s.jenis_sesi}
                    </span>
                    <label className="flex items-center gap-2 text-xs font-medium text-muted">
                      <input type="checkbox" name="aktif" defaultChecked={s.aktif} className="accent-brand" />
                      Aktif
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <TimeField label="Buka" name="jam_buka" value={hhmm(s.jam_buka)} required />
                    <TimeField label="Tutup" name="jam_tutup" value={hhmm(s.jam_tutup)} required />
                    {s.jenis_sesi === "masuk" && (
                      <TimeField label="Batas akhir" name="jam_batas_akhir" value={hhmm(s.jam_batas_akhir)} />
                    )}
                    {s.jenis_sesi === "pulang" && (
                      <TimeField label="Wajar akhir" name="jam_wajar_akhir" value={hhmm(s.jam_wajar_akhir)} />
                    )}
                    <div className="flex items-end">
                      <button className="pressable flex w-full items-center justify-center gap-1.5 rounded-xl bg-text py-2.5 text-sm font-bold text-bg">
                        <Save className="size-4" /> Simpan
                      </button>
                    </div>
                  </div>
                </form>
              ))}
            </div>
          </div>
        ))}
        {hariUrut.length === 0 && (
          <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
            Belum ada jam kerja untuk pola ini.
          </p>
        )}
      </div>
    </div>
  );
}

function TimeField({
  label,
  name,
  value,
  required,
}: {
  label: string;
  name: string;
  value: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted">{label}</span>
      <input
        type="time"
        name={name}
        defaultValue={value}
        required={required}
        className="tabular w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
      />
    </label>
  );
}
