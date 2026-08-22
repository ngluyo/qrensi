-- =========================================================
-- QRensi — Status presensi untuk izin yang disetujui (0009)
-- MASTERPLAN Tahap 4.1/4.2: sanggahan/izin yang DISETUJUI harus mengubah
-- status presensi agar rekap & laporan akurat (temuan audit B14).
-- =========================================================

-- 1) Perluas daftar status presensi.
alter table presensi drop constraint if exists presensi_status_check;
alter table presensi add constraint presensi_status_check check (status in (
  'tepat_waktu','terlambat','pulang_cepat','tidak_hadir',
  'tidak_ada_di_kantor','ditolak_lokasi','ditolak_wajah','ditolak_di_luar_jendela',
  -- baru: hasil izin yang disetujui
  'izin','sakit','cuti','dinas_luar'
));

-- 2) Jejak: presensi mana yang berubah karena sanggahan mana.
alter table presensi
  add column if not exists sanggahan_id uuid references sanggahan(id) on delete set null;

-- 3) Audit log aksi admin (Tahap 4.3) — perubahan sensitif yang berdampak tunjangan.
create table if not exists audit_admin (
  id uuid primary key default gen_random_uuid(),
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  actor_nama text,
  aksi text not null,              -- mis. 'sanggahan.setujui', 'pegawai.hapus', 'jam_kerja.ubah'
  target_tabel text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_admin_waktu on audit_admin (created_at desc);
alter table audit_admin enable row level security;
