import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hashDeviceSecret } from "@/lib/kiosk-auth";
import { generateToken } from "@/lib/qr-token";
import { waktuInstansi, adaSesiTerbukaInstansi, pastikanSesiHarian } from "@/lib/sesi";

const ROTATE_MS = 60 * 1000; // paksa rotasi tiap 60 detik meski belum diklaim

export async function POST(req: Request) {
  let body: { device_secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const secret = String(body.device_secret || "");
  if (!secret) return NextResponse.json({ error: "no_secret" }, { status: 400 });

  const db = createAdminClient();
  const { data: kiosk } = await db
    .from("perangkat_kiosk")
    .select("id, instansi_id, aktif")
    .eq("device_secret_hash", hashDeviceSecret(secret))
    .maybeSingle();

  if (!kiosk || !kiosk.aktif) {
    return NextResponse.json({ error: "kiosk_invalid" }, { status: 401 });
  }

  await db.from("perangkat_kiosk").update({ terakhir_online: new Date().toISOString() }).eq("id", kiosk.id);

  const nowIso = new Date().toISOString();

  // Token aktif yang masih valid & belum wajib rotasi?
  const { data: current } = await db
    .from("qr_token")
    .select("token_value, expires_at, issued_at")
    .eq("perangkat_kiosk_id", kiosk.id)
    .eq("status", "aktif")
    .gt("expires_at", nowIso)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (current) {
    const umur = Date.now() - new Date(current.issued_at).getTime();
    if (umur < ROTATE_MS) {
      return NextResponse.json({
        open: true,
        token_value: current.token_value,
        expires_at: current.expires_at,
      });
    }
    // Terlalu tua -> kedaluwarsakan, buat baru.
    await db.from("qr_token").update({ status: "kedaluwarsa" }).eq("token_value", current.token_value);
  }

  // Perlu token baru: pastikan ada sesi terbuka.
  const { data: instansi } = await db
    .from("instansi")
    .select("timezone")
    .eq("id", kiosk.instansi_id)
    .single();
  const w = waktuInstansi(instansi?.timezone ?? "Asia/Makassar");

  const buka = await adaSesiTerbukaInstansi(db, kiosk.instansi_id, w);
  if (!buka) {
    return NextResponse.json({ open: false, reason: "tidak_ada_sesi" });
  }

  const sesiId = await pastikanSesiHarian(db, buka.jamKerjaSesiId, kiosk.instansi_id, w.tanggal);
  const tok = generateToken({ device_id: kiosk.id, sesi_id: sesiId });

  const { error } = await db.from("qr_token").insert({
    sesi_absensi_harian_id: sesiId,
    perangkat_kiosk_id: kiosk.id,
    token_value: tok.token_value,
    nonce: tok.nonce,
    status: "aktif",
    expires_at: new Date(tok.expires_at).toISOString(),
  });
  if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });

  return NextResponse.json({
    open: true,
    token_value: tok.token_value,
    expires_at: new Date(tok.expires_at).toISOString(),
  });
}
