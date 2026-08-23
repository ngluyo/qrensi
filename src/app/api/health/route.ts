import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Health check ringan untuk monitoring/uptime (pola standar aplikasi
 * self-hosted). Sengaja TIDAK membocorkan detail konfigurasi — rincian
 * lengkap hanya di /admin/diagnostik yang butuh login super admin.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const mulai = Date.now();
  let database: "ok" | "gagal" = "gagal";

  try {
    const db = createAdminClient();
    const { error } = await db.from("instansi").select("id", { head: true, count: "exact" });
    if (!error) database = "ok";
  } catch {
    database = "gagal";
  }

  const sehat = database === "ok";
  return NextResponse.json(
    {
      status: sehat ? "ok" : "gagal",
      database,
      latency_ms: Date.now() - mulai,
      waktu: new Date().toISOString(),
    },
    { status: sehat ? 200 : 503 },
  );
}
