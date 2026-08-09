-- =========================================================
-- QRensi — RLS hardening (0004)
-- Aktifkan RLS (tanpa policy = default DENY) pada tabel konfigurasi/operasional
-- yang TIDAK boleh diakses langsung oleh anon/authenticated dari browser.
-- Semua akses admin ke tabel ini lewat SERVER (service_role, bypass RLS).
-- =========================================================

alter table instansi              enable row level security;
alter table unit_kerja            enable row level security;
alter table pola_hari_kerja       enable row level security;
alter table jam_kerja_sesi        enable row level security;
alter table sesi_absensi_harian   enable row level security;
alter table perangkat_kiosk       enable row level security;
alter table pengaturan_potongan   enable row level security;
alter table admin_unit_kerja      enable row level security;

-- Catatan: pegawai, presensi, qr_token, pegawai_face_enrollment,
-- presensi_verifikasi_log sudah di-enable di 0003.
-- Tidak ada policy dibuat di sini => default deny untuk client;
-- service_role tetap bisa penuh (bypass RLS).
