import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { euclideanDistance, parseVector, FACE_MATCH_THRESHOLD } from "@/lib/face-embedding";
import { signFaceToken } from "@/lib/face-token";
import { pushToAuthUsers, adminAuthUserIds } from "@/lib/push";

/**
 * Verifikasi wajah SERVER-SIDE (blueprint §6.2). HP mengirim descriptor (bukan
 * keputusan). Server menghitung jarak vs embedding tersimpan & memutuskan.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: { descriptor?: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const desc = body.descriptor;
  if (!Array.isArray(desc) || desc.length !== 128) {
    return NextResponse.json({ ok: false, error: "descriptor_invalid" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: pegawai } = await db
    .from("pegawai")
    .select("id, nama, instansi_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!pegawai) return NextResponse.json({ ok: false, error: "bukan_pegawai" }, { status: 403 });

  const { data: enr } = await db
    .from("pegawai_face_enrollment")
    .select("face_embedding")
    .eq("pegawai_id", pegawai.id)
    .maybeSingle();

  if (!enr) {
    return NextResponse.json({ ok: false, error: "belum_enroll" }, { status: 404 });
  }

  const stored = parseVector(enr.face_embedding);
  if (!stored || stored.length !== 128) {
    return NextResponse.json({ ok: false, error: "embedding_rusak" }, { status: 500 });
  }

  const distance = euclideanDistance(desc, stored);
  const cocok = distance <= FACE_MATCH_THRESHOLD;
  // Borderline: lolos tapi mepet ambang → tandai anomali & beri tahu admin.
  const borderline = cocok && distance > FACE_MATCH_THRESHOLD - 0.1;

  await db.from("presensi_verifikasi_log").insert({
    pegawai_id: pegawai.id,
    tipe_event: "face_match",
    hasil: borderline ? "dicurigai" : cocok ? "sukses" : "gagal",
    detail: { distance: Number(distance.toFixed(4)), threshold: FACE_MATCH_THRESHOLD },
  });

  if (!cocok) {
    return NextResponse.json({ ok: false, error: "wajah_tidak_cocok", distance }, { status: 422 });
  }

  if (borderline) {
    // Non-blocking: notifikasi anomali ke admin.
    try {
      const admins = await adminAuthUserIds(db, pegawai.instansi_id as string);
      await pushToAuthUsers(db, admins, {
        title: "Anomali verifikasi wajah",
        body: `${pegawai.nama}: skor wajah mepet (jarak ${distance.toFixed(2)}).`,
        url: "/admin/audit-log",
      });
    } catch {
      /* abaikan kegagalan notif */
    }
  }

  const { token, expires_at } = signFaceToken(pegawai.id);
  return NextResponse.json({ ok: true, face_session_token: token, expires_at, distance });
}
