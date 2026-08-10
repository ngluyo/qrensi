import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { toVectorLiteral } from "@/lib/face-embedding";

/** Enroll wajah pegawai (admin/HR). Body: { pegawai_id, descriptor:number[128] }. */
export async function POST(req: Request) {
  const admin = await requireAdmin();

  let body: { pegawai_id?: string; descriptor?: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const pegawaiId = String(body.pegawai_id || "");
  const desc = body.descriptor;
  if (!pegawaiId || !Array.isArray(desc) || desc.length !== 128) {
    return NextResponse.json({ ok: false, error: "descriptor_invalid" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("pegawai_face_enrollment").upsert(
    {
      pegawai_id: pegawaiId,
      face_embedding: toVectorLiteral(desc),
      enrolled_at: new Date().toISOString(),
      enrolled_by: admin.pegawaiId,
    },
    { onConflict: "pegawai_id" },
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
