// Membuat akun Super Admin pertama (instalasi baru).
//
// Pakai:
//   node scripts/buat-admin.mjs <email> "<Nama Lengkap>"
//
// Skrip membaca .env.local dan memerlukan SUPABASE_SERVICE_ROLE_KEY.
// Aman dijalankan ulang: bila email sudah ada, skrip hanya memastikan
// perannya super_admin (tidak mengubah kata sandi).

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// --- muat .env.local secara sederhana ---
function muatEnv() {
  try {
    for (const baris of readFileSync(".env.local", "utf8").split("\n")) {
      const m = baris.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* boleh jadi env sudah diset dari luar */
  }
}
muatEnv();

const [email, nama] = process.argv.slice(2);
if (!email || !nama) {
  console.error('Pakai: node scripts/buat-admin.mjs <email> "<Nama Lengkap>"');
  process.exit(1);
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local");
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });

const gagal = (pesan) => {
  console.error("GAGAL:", pesan);
  process.exit(1);
};

(async () => {
  // 1. Instansi (dibuat oleh SETUP.sql). Bila belum ada, buat minimal.
  let { data: instansi } = await db.from("instansi").select("id").limit(1).maybeSingle();
  if (!instansi) {
    const r = await db
      .from("instansi")
      .insert({ nama: "Organisasi Anda", kode: "ORG-1", timezone: "Asia/Makassar" })
      .select("id")
      .single();
    if (r.error) gagal("membuat instansi — " + r.error.message);
    instansi = r.data;
    console.log("• Instansi awal dibuat.");
  }

  // 2. Unit kerja rumah untuk admin.
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
    if (r.error) gagal("membuat unit kerja — " + r.error.message);
    unit = r.data;
    console.log("• Unit kerja awal dibuat.");
  }

  // 3. Pola hari kerja (dipakai kolom wajib di tabel pegawai).
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
    if (r.error) gagal("membuat pola hari kerja — " + r.error.message);
    pola = r.data;
    console.log("• Pola hari kerja awal dibuat.");
  }

  // 4. Akun auth.
  const { data: daftar } = await db.auth.admin.listUsers();
  let user = daftar?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  let sandi = null;

  if (!user) {
    sandi = "Qrensi!" + randomBytes(4).toString("hex");
    const r = await db.auth.admin.createUser({
      email,
      password: sandi,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });
    if (r.error) gagal("membuat akun — " + r.error.message);
    user = r.data.user;
    console.log("• Akun login dibuat.");
  } else {
    console.log("• Akun dengan email tersebut sudah ada — kata sandi tidak diubah.");
  }

  // 5. Baris pegawai.
  const { data: peg } = await db
    .from("pegawai")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  let pegawaiId = peg?.id;
  if (!pegawaiId) {
    const r = await db
      .from("pegawai")
      .insert({
        auth_user_id: user.id,
        instansi_id: instansi.id,
        unit_kerja_id: unit.id,
        pola_hari_kerja_id: pola.id,
        nama,
        jabatan: "Administrator",
      })
      .select("id")
      .single();
    if (r.error) gagal("membuat data pegawai — " + r.error.message);
    pegawaiId = r.data.id;
    console.log("• Data pegawai dibuat.");
  }

  // 6. Peran super admin.
  const { error: eRole } = await db
    .from("admin_unit_kerja")
    .upsert(
      { auth_user_id: user.id, unit_kerja_id: unit.id, peran: "super_admin" },
      { onConflict: "auth_user_id,unit_kerja_id" },
    );
  if (eRole) gagal("menetapkan peran — " + eRole.message);

  console.log("\n===========================================");
  console.log(" AKUN SUPER ADMIN SIAP");
  console.log("===========================================");
  console.log(" Email    :", email);
  console.log(" Kata sandi:", sandi ?? "(tidak berubah — pakai yang lama)");
  if (sandi) console.log("\n Sistem akan meminta ganti kata sandi saat login pertama.");
  console.log("===========================================\n");
})().catch((e) => gagal(e.message));
