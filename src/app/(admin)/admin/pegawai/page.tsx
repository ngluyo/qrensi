import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { can, scopeUnits } from "@/lib/izin";
import { PegawaiFilter } from "./pegawai-filter";
import { TambahPegawai } from "./tambah-pegawai";
import { ChevronRight, Users, Upload } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { signedAvatars } from "@/lib/avatar";

const PER_HAL = 20;

type SP = { [k: string]: string | string[] | undefined };

export default async function PegawaiPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const q = ((sp.q as string) || "").trim();
  const unitFilter = (sp.unit as string) || "";
  const statusFilter = (sp.status as string) || "";
  const akunFilter = (sp.akun as string) || "";
  const hal = Math.max(1, parseInt((sp.hal as string) || "1", 10) || 1);

  const db = createAdminClient();
  const lingkup = scopeUnits(user); // null = semua unit

  // Unit yang boleh dilihat user ini.
  let unitQuery = db.from("unit_kerja").select("id, nama").eq("instansi_id", user.instansiId).order("nama");
  if (lingkup) unitQuery = unitQuery.in("id", lingkup.length ? lingkup : ["-"]);
  const { data: units } = await unitQuery;

  // Query pegawai + filter.
  let query = db
    .from("pegawai")
    .select("id, nama, nip, jabatan, status_kepegawaian, auth_user_id, unit_kerja_id, foto_path, unit_kerja(nama), pola_hari_kerja(nama)", { count: "exact" })
    .eq("instansi_id", user.instansiId);

  if (lingkup) query = query.in("unit_kerja_id", lingkup.length ? lingkup : ["-"]);
  if (unitFilter) query = query.eq("unit_kerja_id", unitFilter);
  if (statusFilter) query = query.eq("status_kepegawaian", statusFilter);
  if (akunFilter === "ada") query = query.not("auth_user_id", "is", null);
  if (akunFilter === "belum") query = query.is("auth_user_id", null);
  if (q) query = query.or(`nama.ilike.%${q}%,nip.ilike.%${q}%`);

  const from = (hal - 1) * PER_HAL;
  const { data, count } = await query.order("nama").range(from, from + PER_HAL - 1);

  const rows = (data ?? []).map((p) => ({
    id: p.id as string,
    nama: p.nama as string,
    nip: (p.nip as string) ?? null,
    jabatan: (p.jabatan as string) ?? null,
    status: p.status_kepegawaian as string,
    punyaAkun: !!p.auth_user_id,
    unit: (p.unit_kerja as unknown as { nama: string } | null)?.nama ?? null,
    pola: (p.pola_hari_kerja as unknown as { nama: string } | null)?.nama ?? null,
    fotoPath: (p.foto_path as string) ?? null,
  }));

  const avatarUrls = await signedAvatars(db, rows.map((r) => r.fotoPath));

  const total = count ?? 0;
  const totalHal = Math.max(1, Math.ceil(total / PER_HAL));
  const { data: polaList } = await db
    .from("pola_hari_kerja")
    .select("id, nama")
    .eq("instansi_id", user.instansiId)
    .order("nama");

  function hrefHal(n: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (unitFilter) p.set("unit", unitFilter);
    if (statusFilter) p.set("status", statusFilter);
    if (akunFilter) p.set("akun", akunFilter);
    p.set("hal", String(n));
    return `/admin/pegawai?${p}`;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Pegawai</h1>
          <p className="mt-1 text-sm text-muted">
            {total} pegawai{lingkup ? " di unit Anda" : ""} · ketuk untuk melihat detail
          </p>
        </div>
        {can(user, "pegawai.tambah") && (
          <Link
            href="/admin/pegawai/impor"
            className="pressable flex shrink-0 items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm font-bold shadow-[var(--shadow-sm)]"
          >
            <Upload className="size-4" /> Impor CSV
          </Link>
        )}
      </header>

      <PegawaiFilter units={units ?? []} q={q} unit={unitFilter} status={statusFilter} akun={akunFilter} />

      {/* Daftar */}
      <div className="space-y-2">
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/admin/pegawai/${p.id}`}
            className="pressable flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-sm)]"
          >
            <Avatar nama={p.nama} src={p.fotoPath ? avatarUrls.get(p.fotoPath) : null} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{p.nama}</div>
              <div className="tabular truncate text-xs text-muted">
                {p.nip ? `${p.nip} · ` : ""}
                {p.unit ?? "—"}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  p.punyaAkun ? "bg-success-soft text-success" : "bg-surface-2 text-muted"
                }`}
              >
                {p.punyaAkun ? "Ada akun" : "Belum akun"}
              </span>
              {p.status !== "aktif" && (
                <span className="rounded-md bg-warning-soft px-2 py-0.5 text-[10px] font-semibold capitalize text-warning">
                  {p.status}
                </span>
              )}
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted" />
          </Link>
        ))}

        {rows.length === 0 && (
          <div className="rounded-2xl bg-surface p-8 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
            <Users className="mx-auto mb-2 size-8 opacity-50" />
            {q || unitFilter || statusFilter || akunFilter
              ? "Tidak ada pegawai yang cocok dengan filter."
              : "Belum ada pegawai."}
          </div>
        )}
      </div>

      {/* Paginasi */}
      {totalHal > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Link
            href={hrefHal(Math.max(1, hal - 1))}
            aria-disabled={hal === 1}
            className={`rounded-lg px-3 py-2 font-semibold ${hal === 1 ? "pointer-events-none text-muted opacity-40" : "bg-surface shadow-[var(--shadow-sm)]"}`}
          >
            ← Sebelumnya
          </Link>
          <span className="tabular text-xs text-muted">Hal {hal} / {totalHal}</span>
          <Link
            href={hrefHal(Math.min(totalHal, hal + 1))}
            aria-disabled={hal === totalHal}
            className={`rounded-lg px-3 py-2 font-semibold ${hal === totalHal ? "pointer-events-none text-muted opacity-40" : "bg-surface shadow-[var(--shadow-sm)]"}`}
          >
            Berikutnya →
          </Link>
        </div>
      )}

      {can(user, "pegawai.tambah") && (
        <TambahPegawai units={units ?? []} pola={polaList ?? []} />
      )}
    </div>
  );
}
