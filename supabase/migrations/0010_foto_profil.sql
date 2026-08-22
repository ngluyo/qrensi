-- =========================================================
-- QRensi — Foto profil pegawai (0010)
--
-- CATATAN KEPATUHAN (UU PDP, blueprint §13):
-- Foto profil ini SENGAJA DIPISAH dari foto/embedding enrollment wajah.
-- Enrollment = data biometrik dengan tujuan terbatas (verifikasi presensi),
-- aksesnya hanya server. Foto profil = data kosmetik yang diunggah & dikontrol
-- pegawai sendiri untuk tampilan antarmuka. Keduanya tidak boleh saling dipakai.
-- =========================================================

alter table pegawai
  add column if not exists foto_path text;   -- path di Storage bucket privat 'avatar'
