-- =========================================================
-- QRensi — Row Level Security (0003)
-- Prinsip: default-deny. qr_token TIDAK boleh dibaca client biasa
-- (hanya via API route dengan service_role). Lihat blueprint §11.1.
-- =========================================================

alter table pegawai enable row level security;
alter table presensi enable row level security;
alter table qr_token enable row level security;
alter table pegawai_face_enrollment enable row level security;
alter table presensi_verifikasi_log enable row level security;

-- Pegawai: lihat data dirinya sendiri
create policy "pegawai lihat data sendiri"
  on pegawai for select
  using (auth_user_id = auth.uid());

-- Admin unit / super admin: lihat pegawai di unit yang diampu
create policy "admin lihat pegawai unitnya"
  on pegawai for select
  using (
    unit_kerja_id in (
      select unit_kerja_id from admin_unit_kerja where auth_user_id = auth.uid()
    )
    or exists (
      select 1 from admin_unit_kerja
      where auth_user_id = auth.uid() and peran = 'super_admin'
    )
  );

-- Presensi: pegawai lihat miliknya
create policy "pegawai lihat presensi sendiri"
  on presensi for select
  using (
    pegawai_id in (select id from pegawai where auth_user_id = auth.uid())
  );

-- Presensi: admin unit lihat presensi pegawai unitnya
create policy "admin lihat presensi unitnya"
  on presensi for select
  using (
    pegawai_id in (
      select p.id from pegawai p
      join admin_unit_kerja a on a.unit_kerja_id = p.unit_kerja_id
      where a.auth_user_id = auth.uid()
    )
  );

-- Face enrollment: hanya pemilik yang boleh lihat metadata-nya
-- (embedding mentah hanya diakses server via service_role yang bypass RLS)
create policy "pegawai lihat enrollment sendiri"
  on pegawai_face_enrollment for select
  using (
    pegawai_id in (select id from pegawai where auth_user_id = auth.uid())
  );

-- CATATAN:
-- - qr_token: TIDAK dibuatkan policy apa pun -> default deny untuk anon/authenticated.
--   Akses hanya lewat server-side (service_role bypass RLS).
-- - INSERT/UPDATE presensi & log dilakukan server-side (service_role), jadi
--   tidak perlu policy write untuk client.
