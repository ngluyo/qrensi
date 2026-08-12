"use server";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { exportRekapBulanan } from "@/lib/google-sheets";
import { uploadBackupDrive } from "@/lib/google-drive";
import { computeRekapBulanan, rekapToCsv } from "@/lib/rekap";

export interface EksporState {
  ok: boolean;
  message?: string;
  url?: string;
  baris?: number;
}

export async function eksporSheets(_prev: EksporState, _formData: FormData): Promise<EksporState> {
  const user = await requireAdmin();
  const spreadsheetId = process.env.GOOGLE_SHEETS_REKAP_ID;
  if (!spreadsheetId) return { ok: false, message: "GOOGLE_SHEETS_REKAP_ID belum diset." };

  const db = createAdminClient();
  const { periode, rows } = await computeRekapBulanan(db, user.instansiId!);

  try {
    const res = await exportRekapBulanan(spreadsheetId, `Rekap_${periode}`, periode, rows);
    return { ok: true, url: res.url, baris: res.baris };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Ekspor gagal." };
  }
}

export async function backupDrive(_prev: EksporState, _formData: FormData): Promise<EksporState> {
  const user = await requireAdmin();
  const db = createAdminClient();
  const { periode, rows } = await computeRekapBulanan(db, user.instansiId!);
  const csv = rekapToCsv(periode, rows);
  const filename = `rekap-presensi-${periode}.csv`;

  try {
    const res = await uploadBackupDrive(filename, csv, "text/csv");
    return { ok: true, url: res.url, baris: rows.length };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Backup gagal." };
  }
}
