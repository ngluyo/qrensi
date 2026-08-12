import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computeRekapBulanan, rekapToCsv } from "@/lib/rekap";
import { exportRekapBulanan } from "@/lib/google-sheets";
import { uploadBackupDrive } from "@/lib/google-drive";

/**
 * Cron harian: ekspor rekap ke Google Sheets + backup CSV ke Drive, untuk
 * semua instansi aktif. Idempoten (Sheets overwrite tab; Drive file harian).
 * Dilindungi CRON_SECRET.
 */
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  return !!s && req.headers.get("authorization") === `Bearer ${s}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: instansi } = await db.from("instansi").select("id, kode").eq("aktif", true);

  const spreadsheetId = process.env.GOOGLE_SHEETS_REKAP_ID;
  const punyaDrive = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN);

  const hasil: { instansi: string; sheets?: string; drive?: string; error?: string }[] = [];

  for (const inst of instansi ?? []) {
    const entry: { instansi: string; sheets?: string; drive?: string; error?: string } = {
      instansi: inst.kode as string,
    };
    try {
      const { periode, rows } = await computeRekapBulanan(db, inst.id as string);

      if (spreadsheetId) {
        await exportRekapBulanan(spreadsheetId, `${inst.kode}_${periode}`, periode, rows);
        entry.sheets = "ok";
      }
      if (punyaDrive) {
        const csv = rekapToCsv(periode, rows);
        const stamp = new Date().toISOString().slice(0, 10);
        await uploadBackupDrive(`rekap-${inst.kode}-${periode}-${stamp}.csv`, csv, "text/csv");
        entry.drive = "ok";
      }
    } catch (e) {
      entry.error = e instanceof Error ? e.message : "gagal";
    }
    hasil.push(entry);
  }

  return NextResponse.json({ ok: true, hasil });
}
