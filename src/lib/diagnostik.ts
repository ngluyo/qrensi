import { createAdminClient } from "@/lib/supabase/server";
import { rateLimitPersisten } from "@/lib/rate-limit";

/**
 * Pemeriksaan kesehatan instalasi (MASTERPLAN 6.6 / riset: pola "setup health
 * check" pada aplikasi self-hosted). Tujuannya: pengadopsi baru bisa tahu
 * SEBELUM ada yang rusak — bagian mana yang belum dikonfigurasi.
 *
 * Prinsip: TIDAK PERNAH menampilkan nilai rahasia, hanya "terisi / kosong".
 */

export type Tingkat = "ok" | "peringatan" | "gagal";

export interface Periksa {
  nama: string;
  tingkat: Tingkat;
  pesan: string;
  saran?: string;
  wajib: boolean;
}

export interface HasilDiagnostik {
  ringkas: { ok: number; peringatan: number; gagal: number };
  siapProduksi: boolean;
  kelompok: { judul: string; periksa: Periksa[] }[];
}

const TABEL_WAJIB = [
  "instansi", "unit_kerja", "pola_hari_kerja", "pegawai", "jam_kerja_sesi",
  "sesi_absensi_harian", "perangkat_kiosk", "qr_token", "presensi",
  "presensi_verifikasi_log", "pegawai_face_enrollment", "admin_unit_kerja",
  "pengaturan_potongan", "sanggahan", "push_subscription", "audit_admin",
  "pengaturan_aplikasi",
];

const BUCKET_WAJIB = ["avatar", "sanggahan", "branding"];

function env(nama: string): boolean {
  const v = process.env[nama];
  return !!v && v.trim().length > 0;
}

export async function jalankanDiagnostik(): Promise<HasilDiagnostik> {
  const db = createAdminClient();
  const kelompok: HasilDiagnostik["kelompok"] = [];

  // ---------- 1. Inti (wajib) ----------
  const inti: Periksa[] = [];

  for (const [nama, kunci] of [
    ["URL Supabase", "NEXT_PUBLIC_SUPABASE_URL"],
    ["Kunci anon Supabase", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    ["Kunci service role Supabase", "SUPABASE_SERVICE_ROLE_KEY"],
    ["Kunci tanda tangan QR", "QR_SIGNING_SECRET"],
  ] as const) {
    inti.push({
      nama,
      wajib: true,
      tingkat: env(kunci) ? "ok" : "gagal",
      pesan: env(kunci) ? "Terisi" : "Belum diisi",
      saran: env(kunci) ? undefined : `Isi ${kunci} di .env.local dan di Vercel.`,
    });
  }

  // Tabel database
  const kurangTabel: string[] = [];
  for (const t of TABEL_WAJIB) {
    const { error } = await db.from(t).select("*", { head: true, count: "exact" });
    if (error) kurangTabel.push(t);
  }
  inti.push({
    nama: "Skema database",
    wajib: true,
    tingkat: kurangTabel.length === 0 ? "ok" : "gagal",
    pesan:
      kurangTabel.length === 0
        ? `${TABEL_WAJIB.length} tabel terpasang`
        : `${kurangTabel.length} tabel belum ada: ${kurangTabel.join(", ")}`,
    saran: kurangTabel.length ? "Jalankan supabase/SETUP.sql di Supabase → SQL Editor." : undefined,
  });

  // Bucket storage
  const { data: buckets } = await db.storage.listBuckets();
  const adaBucket = new Set((buckets ?? []).map((b) => b.name));
  const kurangBucket = BUCKET_WAJIB.filter((b) => !adaBucket.has(b));
  const publikSalah = (buckets ?? []).filter((b) => BUCKET_WAJIB.includes(b.name) && b.public);
  inti.push({
    nama: "Bucket penyimpanan",
    wajib: true,
    tingkat: kurangBucket.length ? "gagal" : publikSalah.length ? "peringatan" : "ok",
    pesan: kurangBucket.length
      ? `Belum ada: ${kurangBucket.join(", ")}`
      : publikSalah.length
        ? `Bucket publik (harus privat): ${publikSalah.map((b) => b.name).join(", ")}`
        : "Semua bucket ada & privat",
    saran: kurangBucket.length
      ? "Buat di Supabase → Storage, mode Private."
      : publikSalah.length
        ? "Ubah bucket menjadi Private agar berkas tidak bisa diakses publik."
        : undefined,
  });

  kelompok.push({ judul: "Inti — wajib untuk berjalan", periksa: inti });

  // ---------- 2. Konfigurasi organisasi ----------
  const konfig: Periksa[] = [];

  const { data: set } = await db
    .from("pengaturan_aplikasi")
    .select("nama_aplikasi, nama_organisasi")
    .eq("id", true)
    .maybeSingle();
  const belumDiubah = !set || set.nama_organisasi === "Organisasi Anda";
  konfig.push({
    nama: "Identitas organisasi",
    wajib: false,
    tingkat: belumDiubah ? "peringatan" : "ok",
    pesan: belumDiubah ? "Masih memakai nama bawaan" : `${set?.nama_aplikasi} — ${set?.nama_organisasi}`,
    saran: belumDiubah ? "Sesuaikan di Panel Admin → Pengaturan Aplikasi." : undefined,
  });

  const [{ count: jmlPegawai }, { count: jmlUnit }, { count: jmlJam }, { count: jmlKiosk }] =
    await Promise.all([
      db.from("pegawai").select("id", { count: "exact", head: true }),
      db.from("unit_kerja").select("id", { count: "exact", head: true }),
      db.from("jam_kerja_sesi").select("id", { count: "exact", head: true }),
      db.from("perangkat_kiosk").select("id", { count: "exact", head: true }).eq("aktif", true),
    ]);

  konfig.push({
    nama: "Unit kerja",
    wajib: false,
    tingkat: (jmlUnit ?? 0) > 0 ? "ok" : "peringatan",
    pesan: `${jmlUnit ?? 0} unit`,
    saran: (jmlUnit ?? 0) === 0 ? "Tambah unit kerja di Panel Admin → Pegawai." : undefined,
  });
  konfig.push({
    nama: "Data pegawai",
    wajib: false,
    tingkat: (jmlPegawai ?? 0) > 0 ? "ok" : "peringatan",
    pesan: `${jmlPegawai ?? 0} pegawai terdaftar`,
    saran: (jmlPegawai ?? 0) === 0 ? "Tambah pegawai di Panel Admin → Pegawai." : undefined,
  });
  konfig.push({
    nama: "Jam kerja",
    wajib: false,
    tingkat: (jmlJam ?? 0) > 0 ? "ok" : "gagal",
    pesan: `${jmlJam ?? 0} baris jadwal sesi`,
    saran: (jmlJam ?? 0) === 0 ? "Tanpa jadwal, QR tidak akan pernah muncul. Atur di Panel Admin → Jam Kerja." : undefined,
  });
  konfig.push({
    nama: "Perangkat kiosk",
    wajib: false,
    tingkat: (jmlKiosk ?? 0) > 0 ? "ok" : "peringatan",
    pesan: `${jmlKiosk ?? 0} kiosk aktif`,
    saran: (jmlKiosk ?? 0) === 0 ? "Daftarkan minimal satu kiosk agar pegawai bisa memindai." : undefined,
  });

  kelompok.push({ judul: "Konfigurasi organisasi", periksa: konfig });

  // ---------- 3. Keamanan ----------
  const aman: Periksa[] = [];
  aman.push({
    nama: "Pelindung cron",
    wajib: false,
    tingkat: env("CRON_SECRET") ? "ok" : "peringatan",
    pesan: env("CRON_SECRET") ? "Terisi" : "Belum diisi",
    saran: env("CRON_SECRET") ? undefined : "Tanpa ini endpoint cron menolak semua panggilan (status tetap tidak difinalisasi).",
  });
  aman.push({
    nama: "Rate limit persisten",
    wajib: false,
    tingkat: rateLimitPersisten() ? "ok" : "peringatan",
    pesan: rateLimitPersisten() ? "Upstash Redis aktif" : "Memakai memori per-instance",
    saran: rateLimitPersisten() ? undefined : "Isi UPSTASH_REDIS_REST_URL & TOKEN agar batas berlaku global.",
  });

  const { count: jmlSuper } = await db
    .from("admin_unit_kerja")
    .select("id", { count: "exact", head: true })
    .eq("peran", "super_admin");
  aman.push({
    nama: "Super Admin",
    wajib: true,
    tingkat: (jmlSuper ?? 0) > 0 ? "ok" : "gagal",
    pesan: `${jmlSuper ?? 0} akun`,
    saran: (jmlSuper ?? 0) === 0 ? "Jalankan: node scripts/buat-admin.mjs <email> \"<Nama>\"" : undefined,
  });

  kelompok.push({ judul: "Keamanan", periksa: aman });

  // ---------- 4. Integrasi opsional ----------
  const opsional: Periksa[] = [];
  const punyaVapid = env("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && env("VAPID_PRIVATE_KEY");
  opsional.push({
    nama: "Notifikasi (Web Push)",
    wajib: false,
    tingkat: punyaVapid ? "ok" : "peringatan",
    pesan: punyaVapid ? "Kunci VAPID terisi" : "Belum dikonfigurasi",
    saran: punyaVapid ? undefined : "Jalankan: npx web-push generate-vapid-keys",
  });

  const punyaSheets = env("GOOGLE_SERVICE_ACCOUNT_EMAIL") && env("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") && env("GOOGLE_SHEETS_REKAP_ID");
  opsional.push({
    nama: "Ekspor Google Sheets",
    wajib: false,
    tingkat: punyaSheets ? "ok" : "peringatan",
    pesan: punyaSheets ? "Terkonfigurasi" : "Belum dikonfigurasi",
    saran: punyaSheets ? undefined : "Lihat docs/INSTALASI.md bagian 9.1.",
  });

  const punyaDrive = env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET") && env("GOOGLE_REFRESH_TOKEN");
  opsional.push({
    nama: "Cadangan Google Drive",
    wajib: false,
    tingkat: punyaDrive ? "ok" : "peringatan",
    pesan: punyaDrive ? "Terkonfigurasi (OAuth)" : "Belum dikonfigurasi",
    saran: punyaDrive ? undefined : "Lihat docs/INSTALASI.md bagian 9.2.",
  });

  kelompok.push({ judul: "Integrasi opsional", periksa: opsional });

  // ---------- ringkasan ----------
  const semua = kelompok.flatMap((k) => k.periksa);
  const ringkas = {
    ok: semua.filter((p) => p.tingkat === "ok").length,
    peringatan: semua.filter((p) => p.tingkat === "peringatan").length,
    gagal: semua.filter((p) => p.tingkat === "gagal").length,
  };

  return { ringkas, siapProduksi: ringkas.gagal === 0, kelompok };
}
