"use client";

import { useActionState } from "react";
import { eksporSheets, backupDrive, type EksporState } from "./actions";
import Link from "next/link";
import { FileSpreadsheet, Loader2, ExternalLink, CheckCircle2, HardDriveUpload, Printer } from "lucide-react";

const init: EksporState = { ok: false };

export default function LaporanPage() {
  const [state, action, pending] = useActionState(eksporSheets, init);
  const [driveState, driveAction, drivePending] = useActionState(backupDrive, init);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Laporan</h1>
        <p className="mt-1 text-sm text-muted">
          Ekspor rekap presensi bulan berjalan ke Google Sheets (tab per bulan).
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-success-soft text-success">
            <FileSpreadsheet className="size-6" />
          </div>
          <div>
            <div className="font-bold">Ekspor ke Google Sheets</div>
            <div className="text-xs text-muted">Menulis rekap semua pegawai bulan ini (overwrite tab).</div>
          </div>
        </div>

        <form action={action}>
          <button
            disabled={pending}
            className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-bold text-brand-fg disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : <FileSpreadsheet className="size-5" />}
            {pending ? "Mengekspor…" : "Ekspor sekarang"}
          </button>
        </form>

        {state.ok && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-success-soft p-3 text-sm text-success">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4" /> Berhasil · {state.baris} baris
            </span>
            {state.url && (
              <a href={state.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-bold underline">
                Buka <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        )}
        {!state.ok && state.message && (
          <p className="rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger">{state.message}</p>
        )}
      </div>

      {/* Backup ke Google Drive */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-info-soft text-info">
            <HardDriveUpload className="size-6" />
          </div>
          <div>
            <div className="font-bold">Backup ke Google Drive</div>
            <div className="text-xs text-muted">CSV rekap → folder “QRensi Backup” (Drive pribadi via OAuth).</div>
          </div>
        </div>

        <form action={driveAction}>
          <button
            disabled={drivePending}
            className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-text py-3.5 font-bold text-bg disabled:opacity-60"
          >
            {drivePending ? <Loader2 className="size-5 animate-spin" /> : <HardDriveUpload className="size-5" />}
            {drivePending ? "Mengunggah…" : "Backup CSV ke Drive"}
          </button>
        </form>

        {driveState.ok && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-success-soft p-3 text-sm text-success">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4" /> Terunggah · {driveState.baris} baris
            </span>
            {driveState.url && (
              <a href={driveState.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-bold underline">
                Buka <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        )}
        {!driveState.ok && driveState.message && (
          <p className="rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger">{driveState.message}</p>
        )}
      </div>

      {/* Cetak PDF */}
      <Link
        href="/laporan-cetak"
        target="_blank"
        className="pressable flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]"
      >
        <div className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand">
          <Printer className="size-6" />
        </div>
        <div className="flex-1">
          <div className="font-bold">Laporan siap cetak (PDF)</div>
          <div className="text-xs text-muted">Buka halaman cetak → Simpan sebagai PDF dari browser.</div>
        </div>
        <ExternalLink className="size-4 text-muted" />
      </Link>

      <p className="text-xs text-muted">
        Sheets butuh spreadsheet di-share ke service account (Editor). Drive butuh OAuth
        (GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN) — lihat docs/SETUP_CHECKLIST.
      </p>
    </div>
  );
}
