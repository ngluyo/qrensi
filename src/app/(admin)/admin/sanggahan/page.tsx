import { requireAdmin } from "@/lib/auth";
import { scopeUnits } from "@/lib/izin";
import { createAdminClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { reviewSanggahan } from "./actions";
import { Chip } from "@/components/ui/chip";
import { Check, X, Paperclip } from "lucide-react";

interface Row {
  id: string;
  jenis: string;
  tanggal: string;
  alasan: string;
  status: string;
  catatan_admin: string | null;
  lampiran_path: string | null;
  created_at: string;
  pegawai: { nama: string } | null;
}

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

export default async function SanggahanPage() {
  const user = await requireAdmin();
  const db = createAdminClient();
  const lingkup = scopeUnits(user);

  // Admin OPD: batasi ke pegawai unitnya.
  let pegawaiIds: string[] | null = null;
  if (lingkup) {
    const { data: peg } = await db
      .from("pegawai")
      .select("id")
      .in("unit_kerja_id", lingkup.length ? lingkup : ["-"]);
    pegawaiIds = (peg ?? []).map((p) => p.id as string);
  }

  let q = db
    .from("sanggahan")
    .select("id, jenis, tanggal, alasan, status, catatan_admin, lampiran_path, created_at, pegawai(nama)")
    .eq("instansi_id", user.instansiId);
  if (pegawaiIds) q = q.in("pegawai_id", pegawaiIds.length ? pegawaiIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data } = await q
    .order("status", { ascending: true }) // pending dulu (alfabet: disetujui<ditolak<pending? -> urut manual di bawah)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as Row[];
  // pending paling atas
  rows.sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));

  // Signed URL untuk lampiran.
  const links = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.lampiran_path)
      .map(async (r) => {
        const { data: s } = await db.storage.from("sanggahan").createSignedUrl(r.lampiran_path!, 3600);
        if (s?.signedUrl) links.set(r.id, s.signedUrl);
      }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Izin &amp; Sanggahan</h1>
        <p className="mt-1 text-sm text-muted">Tinjau pengajuan pegawai. Keputusan dicatat sebagai jejak.</p>
      </header>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{r.pegawai?.nama ?? "—"}</div>
                <div className="tabular text-xs text-muted">
                  {JENIS_LABEL[r.jenis] ?? r.jenis} · {format(new Date(r.tanggal), "d MMM yyyy", { locale: id })}
                </div>
              </div>
              <Chip tone={STATUS_TONE[r.status] ?? "muted"}>{r.status}</Chip>
            </div>
            <p className="mt-2 text-sm">{r.alasan}</p>
            {r.lampiran_path && links.get(r.id) && (
              <a href={links.get(r.id)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                <Paperclip className="size-3.5" /> Lihat lampiran
              </a>
            )}
            {r.catatan_admin && (
              <p className="mt-2 rounded-lg bg-surface-2 p-2 text-xs text-muted">Catatan: {r.catatan_admin}</p>
            )}

            {r.status === "pending" && (
              <form action={reviewSanggahan} className="mt-3 space-y-2 border-t border-border pt-3">
                <input type="hidden" name="id" value={r.id} />
                <input name="catatan" placeholder="Catatan (opsional)" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand" />
                <div className="flex gap-2">
                  <button name="keputusan" value="disetujui" className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success py-2 text-sm font-bold text-white">
                    <Check className="size-4" /> Setujui
                  </button>
                  <button name="keputusan" value="ditolak" className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-danger py-2 text-sm font-bold text-white">
                    <X className="size-4" /> Tolak
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
            Belum ada pengajuan.
          </p>
        )}
      </div>
    </div>
  );
}
