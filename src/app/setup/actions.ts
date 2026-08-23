"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { butuhSetup } from "@/lib/setup";

export interface SetupState {
  ok: boolean;
  message?: string;
  selesai?: boolean;
  email?: string;
}

/**
 * Membuat Super Admin pertama + identitas organisasi, lewat browser.
 *
 * KEAMANAN: aksi ini hanya berjalan bila BELUM ADA satu pun super admin
 * (`butuhSetup()`). Setelah admin pertama dibuat, endpoint ini menolak
 * selamanya sehingga tidak bisa dipakai membuat akun liar.
 */
export async function jalankanSetup(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  // Gerbang utama — dicek ulang di server, bukan sekadar di UI.
  if (!(await butuhSetup())) {
    return { ok: false, message: "Setup sudah pernah dilakukan. Halaman ini tidak aktif lagi." };
  }

  const namaOrganisasi = String(formData.get("nama_organisasi") || "").trim();
  const namaAplikasi = String(formData.get("nama_aplikasi") || "").trim() || "QRensi";
  const timezone = String(formData.get("timezone") || "Asia/Makassar");
  const namaAdmin = String(formData.get("nama_admin") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const sandi = String(formData.get("sandi") || "");
  const sandi2 = String(formData.get("sandi2") || "");

  if (!namaOrganisasi) return { ok: false, message: "Nama organisasi wajib diisi." };
  if (!namaAdmin) return { ok: false, message: "Nama admin wajib diisi." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Email tidak valid." };
  if (sandi.length < 8) return { ok: false, message: "Kata sandi minimal 8 karakter." };
  if (sandi !== sandi2) return { ok: false, message: "Konfirmasi kata sandi tidak sama." };

  const db = createAdminClient();

  // 1. Instansi
  let { data: instansi } = await db.from("instansi").select("id").limit(1).maybeSingle();
  if (!instansi) {
    const kode = namaOrganisasi.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 30) || "ORG";
    const r = await db
      .from("instansi")
      .insert({ nama: namaOrganisasi, kode, timezone })
      .select("id")
      .single();
    if (r.error) return { ok: false, message: "Gagal membuat instansi: " + r.error.message };
    instansi = r.data;
  } else {
    await db.from("instansi").update({ nama: namaOrganisasi, timezone }).eq("id", instansi.id);
  }

  // 2. Unit kerja awal
  let { data: unit } = await db
    .from("unit_kerja")
    .select("id")
    .eq("instansi_id", instansi.id)
    .limit(1)
    .maybeSingle();
  if (!unit) {
    const r = await db
      .from("unit_kerja")
      .insert({ instansi_id: instansi.id, nama: "Sekretariat" })
      .select("id")
      .single();
    if (r.error) return { ok: false, message: "Gagal membuat unit kerja: " + r.error.message };
    unit = r.data;
  }

  // 3. Pola hari kerja awal
  let { data: pola } = await db
    .from("pola_hari_kerja")
    .select("id")
    .eq("instansi_id", instansi.id)
    .limit(1)
    .maybeSingle();
  if (!pola) {
    const r = await db
      .from("pola_hari_kerja")
      .insert({ instansi_id: instansi.id, nama: "Senin-Jumat", hari_aktif: [2, 3, 4, 5, 6] })
      .select("id")
      .single();
    if (r.error) return { ok: false, message: "Gagal membuat pola hari kerja: " + r.error.message };
    pola = r.data;
  }

  // 4. Akun auth — kata sandi dipilih sendiri, jadi tidak perlu paksa ganti.
  const { data: daftar } = await db.auth.admin.listUsers();
  let user = daftar?.users?.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    const r = await db.auth.admin.createUser({
      email,
      password: sandi,
      email_confirm: true,
      user_metadata: { must_change_password: false },
    });
    if (r.error) return { ok: false, message: "Gagal membuat akun: " + r.error.message };
    user = r.data.user;
  }

  // 5. Data pegawai untuk admin
  const { data: peg } = await db
    .from("pegawai")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!peg) {
    const r = await db.from("pegawai").insert({
      auth_user_id: user.id,
      instansi_id: instansi.id,
      unit_kerja_id: unit.id,
      pola_hari_kerja_id: pola.id,
      nama: namaAdmin,
      jabatan: "Administrator",
    });
    if (r.error) return { ok: false, message: "Gagal membuat data pegawai: " + r.error.message };
  }

  // 6. Peran super admin
  const r = await db
    .from("admin_unit_kerja")
    .upsert(
      { auth_user_id: user.id, unit_kerja_id: unit.id, peran: "super_admin" },
      { onConflict: "auth_user_id,unit_kerja_id" },
    );
  if (r.error) return { ok: false, message: "Gagal menetapkan peran: " + r.error.message };

  // 7. Identitas aplikasi (bila tabelnya sudah ada)
  await db
    .from("pengaturan_aplikasi")
    .update({
      nama_aplikasi: namaAplikasi,
      nama_organisasi: namaOrganisasi,
      singkatan: namaAplikasi.slice(0, 2).toUpperCase(),
      timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  revalidatePath("/", "layout");
  return { ok: true, selesai: true, email };
}
