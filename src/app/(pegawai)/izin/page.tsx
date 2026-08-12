import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { IzinForm } from "./izin-form";
import { Chip } from "@/components/ui/chip";

const JENIS_LABEL: Record<string, string> = {
  sanggahan: "Sanggahan",
  izin: "Izin",
  sakit: "Sakit",
  cuti: "Cuti",
  dinas_luar: "Dinas luar",
};
const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "muted"> = {
  pending: "warning",
  disetujui: "success",
  ditolak: "danger",
};

export default async function IzinPage() {
  const user = await requireUser("/izin");
  const db = createAdminClient();
  const { data } = user.pegawaiId
    ? await db
        .from("sanggahan")
        .select("id, jenis, tanggal, alasan, status, catatan_admin, created_at")
        .eq("pegawai_id", user.pegawaiId)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Izin &amp; Sanggahan</h1>
        <p className="mt-1 text-sm text-muted">Ajukan izin/sakit/cuti/dinas atau sanggah status presensi.</p>
      </header>

      <IzinForm />

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-muted">Riwayat pengajuan</h2>
        {(data ?? []).map((s) => (
          <div key={s.id} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{JENIS_LABEL[s.jenis] ?? s.jenis}</span>
              <Chip tone={STATUS_TONE[s.status] ?? "muted"}>{s.status}</Chip>
            </div>
            <div className="tabular mt-0.5 text-xs text-muted">
              {format(new Date(s.tanggal), "d MMM yyyy", { locale: id })}
            </div>
            <p className="mt-1.5 text-sm">{s.alasan}</p>
            {s.catatan_admin && (
              <p className="mt-1.5 rounded-lg bg-surface-2 p-2 text-xs text-muted">
                Catatan admin: {s.catatan_admin}
              </p>
            )}
          </div>
        ))}
        {(data ?? []).length === 0 && (
          <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
            Belum ada pengajuan.
          </p>
        )}
      </div>
    </div>
  );
}
