-- =========================================================
-- QRensi — Data pribadi pegawai (0008)
-- Pemisahan employee self-service (docs/PERAN.md):
--   * Data KEPEGAWAIAN (nip, jabatan, unit_kerja, pola, status) -> hanya admin,
--     karena memengaruhi perhitungan presensi & tunjangan.
--   * Data PRIBADI/kontak (di bawah ini) -> boleh diubah pegawai sendiri.
-- =========================================================

alter table pegawai
  add column if not exists no_hp text,
  add column if not exists email_kontak text,
  add column if not exists alamat text;
