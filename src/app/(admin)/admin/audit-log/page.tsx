import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle2, XCircle, AlertTriangle, ScrollText } from "lucide-react";

interface LogRow {
  id: string;
  tipe_event: string;
  hasil: string;
  detail: Record<string, unknown> | null;
  created_at: string;
  pegawai: { nama: string } | null;
}

const HASIL_META: Record<string, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  sukses: { label: "Sukses", tone: "text-success bg-success-soft", icon: CheckCircle2 },
  gagal: { label: "Gagal", tone: "text-danger bg-danger-soft", icon: XCircle },
  dicurigai: { label: "Dicurigai", tone: "text-warning bg-warning-soft", icon: AlertTriangle },
};

const TIPE_LABEL: Record<string, string> = {
  qr_scan_attempt: "Scan QR",
  face_match: "Cocok wajah",
  device_check: "Cek perangkat",
  anomaly_flag: "Anomali",
};

type SP = { [k: string]: string | string[] | undefined };

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const fHasil = (sp.hasil as string) || "";
  const fTipe = (sp.tipe as string) || "";

  const db = createAdminClient();
  let q = db
    .from("presensi_verifikasi_log")
    .select("id, tipe_event, hasil, detail, created_at, pegawai(nama)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (fHasil) q = q.eq("hasil", fHasil);
  if (fTipe) q = q.eq("tipe_event", fTipe);
  const { data } = await q;
  const rows = (data ?? []) as unknown as LogRow[];

  const chip = (label: string, active: boolean, href: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-brand text-brand-fg" : "border border-border bg-surface text-muted"
      }`}
    >
      {label}
    </Link>
  );

  const base = (hasil: string, tipe: string) => {
    const p = new URLSearchParams();
    if (hasil) p.set("hasil", hasil);
    if (tipe) p.set("tipe", tipe);
    const s = p.toString();
    return `/admin/audit-log${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted">
          Jejak percobaan verifikasi (100 terbaru). Dipakai untuk investigasi &amp; sanggahan.
        </p>
      </header>

      {/* Filter hasil */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {chip("Semua hasil", !fHasil, base("", fTipe))}
          {chip("Sukses", fHasil === "sukses", base("sukses", fTipe))}
          {chip("Gagal", fHasil === "gagal", base("gagal", fTipe))}
          {chip("Dicurigai", fHasil === "dicurigai", base("dicurigai", fTipe))}
        </div>
        <div className="flex flex-wrap gap-2">
          {chip("Semua tipe", !fTipe, base(fHasil, ""))}
          {chip("Scan QR", fTipe === "qr_scan_attempt", base(fHasil, "qr_scan_attempt"))}
          {chip("Cocok wajah", fTipe === "face_match", base(fHasil, "face_match"))}
        </div>
      </div>

      {/* Daftar log */}
      <div className="space-y-2">
        {rows.map((r) => {
          const meta = HASIL_META[r.hasil] ?? HASIL_META.gagal;
          const Icon = meta.icon;
          const reason = (r.detail?.reason as string) || (r.detail?.status as string) || "";
          const distance = r.detail?.distance as number | undefined;
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-sm)]">
              <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${meta.tone}`}>
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{r.pegawai?.nama ?? "—"}</span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                    {TIPE_LABEL[r.tipe_event] ?? r.tipe_event}
                  </span>
                </div>
                <div className="tabular truncate text-xs text-muted">
                  {format(new Date(r.created_at), "d MMM HH:mm:ss", { locale: id })}
                  {reason ? ` · ${reason}` : ""}
                  {distance !== undefined ? ` · jarak ${distance}` : ""}
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="rounded-2xl bg-surface p-8 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
            <ScrollText className="mx-auto mb-2 size-8 opacity-50" />
            Belum ada log untuk filter ini.
          </div>
        )}
      </div>
    </div>
  );
}
