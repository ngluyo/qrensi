import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { tutupSesiHarian } from "@/lib/tutup-sesi";

/**
 * Cron: finalisasi sesi harian yang jendelanya sudah tutup.
 * Dilindungi header `Authorization: Bearer <CRON_SECRET>` (Vercel Cron mengirim
 * header ini otomatis bila CRON_SECRET diset di env).
 */
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const hasil = await tutupSesiHarian(db);
  return NextResponse.json({ ok: true, ...hasil });
}
