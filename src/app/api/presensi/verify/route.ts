import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/qr-token";
import { waktuInstansi, cariSesiTerbukaPola, pastikanSesiHarian } from "@/lib/sesi";

/**
 * Verifikasi presensi (blueprint §5.2). Fase 1: tanpa face_session_token
 * (face verification menyusul di Fase 2). Klaim token atomik + resolusi sesi
 * per-pegawai + simpan presensi.
 */
export async function POST(req: Request) {
  // 1. Autentikasi pegawai (sesi login).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: { token_value?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const tokenValue = String(body.token_value || "");

  const db = createAdminClient();

  // 2. Profil pegawai.
  const { data: pegawai } = await db
    .from("pegawai")
    .select("id, instansi_id, pola_hari_kerja_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!pegawai) return NextResponse.json({ ok: false, error: "bukan_pegawai" }, { status: 403 });

  const logEvent = (tipe: string, hasil: string, detail: unknown, presensiId?: string) =>
    db.from("presensi_verifikasi_log").insert({
      presensi_id: presensiId ?? null,
      pegawai_id: pegawai.id,
      tipe_event: tipe,
      hasil,
      detail: detail as object,
    });

  // 3. Validasi tanda tangan + kedaluwarsa token.
  const v = verifyToken(tokenValue);
  if (!v.valid) {
    await logEvent("qr_scan_attempt", "gagal", { reason: v.reason });
    return NextResponse.json({ ok: false, error: "token_invalid", reason: v.reason }, { status: 400 });
  }

  // 4. Klaim ATOMIK: hanya satu request yang menang.
  const nowIso = new Date().toISOString();
  const { data: claimed } = await db
    .from("qr_token")
    .update({ status: "diklaim", diklaim_oleh_pegawai_id: pegawai.id, diklaim_at: nowIso })
    .eq("token_value", tokenValue)
    .eq("status", "aktif")
    .gt("expires_at", nowIso)
    .select("id, perangkat_kiosk_id")
    .maybeSingle();

  if (!claimed) {
    await logEvent("qr_scan_attempt", "gagal", { reason: "sudah_dipakai_atau_kedaluwarsa" });
    return NextResponse.json({ ok: false, error: "token_terpakai" }, { status: 409 });
  }

  // 5. Resolusi sesi pegawai + evaluasi status.
  const { data: instansi } = await db
    .from("instansi")
    .select("timezone")
    .eq("id", pegawai.instansi_id)
    .single();
  const w = waktuInstansi(instansi?.timezone ?? "Asia/Makassar");
  const hit = await cariSesiTerbukaPola(db, pegawai.pola_hari_kerja_id, w);

  if (!hit || !hit.eval.diterima) {
    await db.from("qr_token").update({ status: "gagal" }).eq("id", claimed.id);
    await logEvent("qr_scan_attempt", "gagal", { reason: hit?.eval.alasan ?? "tidak_ada_sesi" });
    return NextResponse.json(
      { ok: false, error: "di_luar_jendela", detail: hit?.eval.alasan ?? "tidak_ada_sesi" },
      { status: 422 },
    );
  }

  // Prasyarat: istirahat/pulang hanya untuk yang sesi masuknya berhasil hari ini.
  if (hit.sesi.jenis_sesi !== "masuk") {
    const { data: masukSesi } = await db
      .from("jam_kerja_sesi")
      .select("id")
      .eq("pola_hari_kerja_id", pegawai.pola_hari_kerja_id)
      .eq("hari", w.hari)
      .eq("jenis_sesi", "masuk")
      .maybeSingle();
    let hadirPagi = false;
    if (masukSesi) {
      const { data: sh } = await db
        .from("sesi_absensi_harian")
        .select("id")
        .eq("jam_kerja_sesi_id", masukSesi.id)
        .eq("tanggal", w.tanggal)
        .maybeSingle();
      if (sh) {
        const { data: pm } = await db
          .from("presensi")
          .select("status")
          .eq("sesi_absensi_harian_id", sh.id)
          .eq("pegawai_id", pegawai.id)
          .maybeSingle();
        hadirPagi = !!pm && (pm.status === "tepat_waktu" || pm.status === "terlambat");
      }
    }
    if (!hadirPagi) {
      await db.from("qr_token").update({ status: "gagal" }).eq("id", claimed.id);
      await logEvent("qr_scan_attempt", "gagal", { reason: "masuk_belum_berhasil", jenis: hit.sesi.jenis_sesi });
      return NextResponse.json({ ok: false, error: "masuk_belum" }, { status: 422 });
    }
  }

  const sesiId = await pastikanSesiHarian(db, hit.sesi.id, pegawai.instansi_id, w.tanggal);

  // 6. Simpan presensi (unik per pegawai+sesi).
  const { data: presensi, error: insErr } = await db
    .from("presensi")
    .insert({
      sesi_absensi_harian_id: sesiId,
      pegawai_id: pegawai.id,
      perangkat_kiosk_id: claimed.perangkat_kiosk_id,
      waktu_absen: nowIso,
      status: hit.eval.status,
      menit_keterlambatan: hit.eval.menit_keterlambatan,
    })
    .select("id")
    .single();

  if (insErr) {
    // Kemungkinan besar: sudah absen untuk sesi ini (unique violation).
    await db.from("qr_token").update({ status: "gagal" }).eq("id", claimed.id);
    await logEvent("qr_scan_attempt", "gagal", { reason: "sudah_absen", db: insErr.code });
    return NextResponse.json({ ok: false, error: "sudah_absen", jenis: hit.sesi.jenis_sesi }, { status: 409 });
  }

  // 7. Sukses: tandai token digunakan + log.
  await db.from("qr_token").update({ status: "digunakan" }).eq("id", claimed.id);
  await logEvent("qr_scan_attempt", "sukses", { status: hit.eval.status }, presensi.id);

  return NextResponse.json({
    ok: true,
    jenis: hit.sesi.jenis_sesi,
    status: hit.eval.status,
    menit_keterlambatan: hit.eval.menit_keterlambatan,
  });
}
