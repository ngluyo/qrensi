-- =========================================================================
--  QRensi — SETUP DATABASE (SEKALI JALAN)
--  =======================================================================
--  Jalankan SELURUH isi berkas ini di Supabase → SQL Editor → Run.
--  Aman dijalankan ulang (idempoten): objek yang sudah ada akan dilewati.
--
--  Berkas ini adalah gabungan seluruh migrasi 0001–0011. Untuk instalasi
--  baru, cukup jalankan berkas INI saja — tidak perlu satu per satu.
--
--  Setelah selesai, lanjutkan ke docs/INSTALASI.md langkah berikutnya
--  (membuat bucket Storage & akun admin pertama).
-- =========================================================================


-- ============ [0001_init_schema.sql] ============
-- =========================================================
-- QRensi — Skema awal (0001)
-- Sumber: blueprint §4.2 (v2). Urutan CREATE diperbaiki agar
-- foreign key selalu merujuk tabel yang sudah ada.
-- =========================================================

-- 0. EXTENSIONS ------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
-- pgvector untuk face embedding similarity. Jika tak tersedia,
-- ganti kolom face_embedding ke float8[] (lihat catatan di bawah).
create extension if not exists vector;

-- 1. INSTANSI & UNIT KERJA (multi-tenant) ---------------------
create table if not exists instansi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kode text unique not null,                         -- mis. 'PEMKAB-KOTABARU'
  radius_geofence_meter int not null default 100,
  latitude numeric(10,7),
  longitude numeric(10,7),
  timezone text not null default 'Asia/Makassar',    -- WITA
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists unit_kerja (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id) on delete cascade,
  nama text not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  radius_geofence_meter int,
  created_at timestamptz not null default now()
);

-- 2. POLA HARI KERJA (dibuat sebelum pegawai karena direferensi)
create table if not exists pola_hari_kerja (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id) on delete cascade,
  nama text not null,                                -- 'Senin-Jumat', 'Senin-Sabtu'
  hari_aktif int[] not null,                         -- 1=Minggu..7=Sabtu
  created_at timestamptz not null default now()
);

-- 3. PEGAWAI ---------------------------------------------------
create table if not exists pegawai (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  instansi_id uuid not null references instansi(id),
  unit_kerja_id uuid not null references unit_kerja(id),
  nip text unique,
  nama text not null,
  jabatan text,
  pola_hari_kerja_id uuid not null references pola_hari_kerja(id),
  status_kepegawaian text not null default 'aktif'
    check (status_kepegawaian in ('aktif','cuti','nonaktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. JAM KERJA SESI (editable via UI admin, tidak retroaktif) --
create table if not exists jam_kerja_sesi (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id) on delete cascade,
  pola_hari_kerja_id uuid not null references pola_hari_kerja(id) on delete cascade,
  hari int not null,                                 -- 1=Minggu..7=Sabtu
  jenis_sesi text not null check (jenis_sesi in ('masuk','istirahat','pulang')),
  jam_buka time not null,
  jam_tutup time not null,
  jam_batas_akhir time,                              -- sesi masuk: batas mutlak (mis. 10:00)
  jam_wajar_akhir time,                              -- sesi pulang: batas 'pulang cepat'
  mode_sebelum_jendela text default 'blokir'
    check (mode_sebelum_jendela in ('blokir','izinkan_dengan_status')),
  mode_setelah_jendela text default 'izinkan_dengan_status'
    check (mode_setelah_jendela in ('blokir','izinkan_dengan_status')),
  urutan int not null default 1,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (instansi_id, pola_hari_kerja_id, hari, jenis_sesi)
);

-- 5. SESI ABSENSI HARIAN (instance per tanggal) ----------------
create table if not exists sesi_absensi_harian (
  id uuid primary key default gen_random_uuid(),
  jam_kerja_sesi_id uuid not null references jam_kerja_sesi(id),
  instansi_id uuid not null references instansi(id),
  tanggal date not null,
  status text not null default 'terjadwal'
    check (status in ('terjadwal','dibuka','ditutup')),
  dibuka_at timestamptz,
  ditutup_at timestamptz,
  created_at timestamptz not null default now(),
  unique (jam_kerja_sesi_id, tanggal)
);

-- 6. PERANGKAT KIOSK (device binding di kiosk, bukan HP) -------
create table if not exists perangkat_kiosk (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id) on delete cascade,
  unit_kerja_id uuid references unit_kerja(id),
  nama_perangkat text not null,
  device_secret_hash text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  aktif boolean not null default true,
  terakhir_online timestamptz,
  created_at timestamptz not null default now()
);

-- 7. QR TOKEN (milik kiosk; klaim atomik) ---------------------
create table if not exists qr_token (
  id uuid primary key default gen_random_uuid(),
  sesi_absensi_harian_id uuid not null references sesi_absensi_harian(id) on delete cascade,
  perangkat_kiosk_id uuid not null references perangkat_kiosk(id),
  token_value text not null unique,
  nonce text not null,
  status text not null default 'aktif'
    check (status in ('aktif','diklaim','digunakan','gagal','kedaluwarsa')),
  diklaim_oleh_pegawai_id uuid references pegawai(id),
  diklaim_at timestamptz,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null                    -- issued_at + 2 menit
);
create index if not exists idx_qr_token_lookup on qr_token (token_value) where status = 'aktif';
create index if not exists idx_qr_token_kiosk_sesi on qr_token (perangkat_kiosk_id, sesi_absensi_harian_id);

-- 8. PRESENSI --------------------------------------------------
create table if not exists presensi (
  id uuid primary key default gen_random_uuid(),
  sesi_absensi_harian_id uuid not null references sesi_absensi_harian(id),
  pegawai_id uuid not null references pegawai(id),
  perangkat_kiosk_id uuid references perangkat_kiosk(id),
  waktu_absen timestamptz not null default now(),
  status text not null check (status in (
    'tepat_waktu','terlambat','pulang_cepat','tidak_hadir',
    'tidak_ada_di_kantor','ditolak_lokasi','ditolak_wajah','ditolak_di_luar_jendela'
  )),
  menit_keterlambatan int not null default 0,
  skor_kecocokan_wajah numeric(5,4),                 -- 0..1 cosine similarity (server-side)
  skor_liveness numeric(5,4),
  ip_address inet,
  catatan text,
  created_at timestamptz not null default now(),
  unique (sesi_absensi_harian_id, pegawai_id)
);
create index if not exists idx_presensi_tanggal on presensi (sesi_absensi_harian_id, pegawai_id);

-- 9. VERIFIKASI LOG (audit trail granular) --------------------
create table if not exists presensi_verifikasi_log (
  id uuid primary key default gen_random_uuid(),
  presensi_id uuid references presensi(id),
  pegawai_id uuid references pegawai(id),
  tipe_event text not null,   -- 'qr_scan_attempt','face_match','device_check','anomaly_flag'
  hasil text not null,        -- 'sukses','gagal','dicurigai'
  detail jsonb,
  created_at timestamptz not null default now()
);

-- 10. FACE ENROLLMENT -----------------------------------------
-- CATATAN: jika pgvector tidak aktif, ganti `vector(128)` -> `float8[]`
-- dan hitung cosine similarity di aplikasi (JS), bukan di SQL.
create table if not exists pegawai_face_enrollment (
  id uuid primary key default gen_random_uuid(),
  pegawai_id uuid not null references pegawai(id) unique,
  face_embedding vector(128),
  foto_storage_path text,                            -- bucket privat
  enrolled_at timestamptz not null default now(),
  enrolled_by uuid references pegawai(id)
);

-- 11. ADMIN UNIT KERJA (untuk RLS admin, dirujuk blueprint §11.1)
create table if not exists admin_unit_kerja (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  unit_kerja_id uuid not null references unit_kerja(id) on delete cascade,
  peran text not null default 'admin_unit'
    check (peran in ('admin_unit','super_admin')),
  created_at timestamptz not null default now(),
  unique (auth_user_id, unit_kerja_id)
);
create index if not exists idx_pegawai_unit on pegawai (unit_kerja_id, status_kepegawaian);

-- 12. PENGATURAN POTONGAN TUNJANGAN (berjenjang) --------------
create table if not exists pengaturan_potongan (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id) on delete cascade,
  jenis text not null check (jenis in ('terlambat','pulang_cepat','tidak_hadir')),
  menit_dari int not null,
  menit_sampai int,                                  -- null = tak terhingga
  persen_potongan numeric(5,2) not null,             -- mis. 0.5 = 0.5%
  created_at timestamptz not null default now()
);

-- =========================================================
-- updated_at trigger untuk pegawai
-- =========================================================
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_pegawai_updated_at
  before update on pegawai
  for each row execute function set_updated_at();

-- ============ [0002_seed_default.sql] ============
-- =========================================================
-- QRensi — Seed default (0002)
-- Data awal EDITABLE via UI admin. Angka jam = default sementara,
-- menunggu SK resmi jam kerja ASN Kotabaru (lihat docs/SETUP_CHECKLIST §6).
-- Konvensi hari: 1=Minggu, 2=Senin, ... 7=Sabtu.
-- =========================================================

do $$
declare
  v_instansi uuid;
  v_pola_jumat uuid;   -- pola "Senin-Jumat"
  v_pola_sabtu uuid;   -- pola "Senin-Sabtu"
  d int;
begin
  -- Idempoten: lewati seluruh seed bila sudah ada instansi.
  if exists (select 1 from instansi) then
    raise notice 'Seed dilewati: data instansi sudah ada.';
    return;
  end if;

  -- Instansi contoh
  insert into instansi (nama, kode, radius_geofence_meter, latitude, longitude, timezone)
  values ('Pemerintah Kabupaten Kotabaru', 'PEMKAB-KOTABARU', 100, -3.2410000, 116.2810000, 'Asia/Makassar')
  returning id into v_instansi;

  -- Pola hari kerja
  insert into pola_hari_kerja (instansi_id, nama, hari_aktif)
  values (v_instansi, 'Senin-Jumat', array[2,3,4,5,6]) returning id into v_pola_jumat;
  insert into pola_hari_kerja (instansi_id, nama, hari_aktif)
  values (v_instansi, 'Senin-Sabtu', array[2,3,4,5,6,7]) returning id into v_pola_sabtu;

  -- ---- Pola Senin-Jumat ----
  -- Senin-Kamis (2..5): masuk + istirahat + pulang
  for d in 2..5 loop
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan)
      values (v_instansi, v_pola_jumat, d, 'masuk', '07:15', '07:45', '10:00', 1);
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, urutan)
      values (v_instansi, v_pola_jumat, d, 'istirahat', '12:30', '13:30', 2);
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_wajar_akhir, urutan)
      values (v_instansi, v_pola_jumat, d, 'pulang', '16:30', '17:30', '16:30', 3);
  end loop;
  -- Jumat (6): masuk + pulang (tanpa istirahat)
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan)
    values (v_instansi, v_pola_jumat, 6, 'masuk', '07:15', '07:45', '10:00', 1);
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_wajar_akhir, urutan)
    values (v_instansi, v_pola_jumat, 6, 'pulang', '11:00', '12:00', '11:00', 3);

  -- ---- Pola Senin-Sabtu ---- (Senin-Kamis sama; Jumat sama; Sabtu pulang 12:00-13:00)
  for d in 2..5 loop
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan)
      values (v_instansi, v_pola_sabtu, d, 'masuk', '07:15', '07:45', '10:00', 1);
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, urutan)
      values (v_instansi, v_pola_sabtu, d, 'istirahat', '12:30', '13:30', 2);
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_wajar_akhir, urutan)
      values (v_instansi, v_pola_sabtu, d, 'pulang', '16:30', '17:30', '16:30', 3);
  end loop;
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan)
    values (v_instansi, v_pola_sabtu, 6, 'masuk', '07:15', '07:45', '10:00', 1);
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_wajar_akhir, urutan)
    values (v_instansi, v_pola_sabtu, 6, 'pulang', '11:00', '12:00', '11:00', 3);
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan)
    values (v_instansi, v_pola_sabtu, 7, 'masuk', '07:15', '07:45', '10:00', 1);
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, urutan)
    values (v_instansi, v_pola_sabtu, 7, 'istirahat', '12:30', '13:30', 2);
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_wajar_akhir, urutan)
    values (v_instansi, v_pola_sabtu, 7, 'pulang', '12:00', '13:00', '12:00', 3);

  -- Pengaturan potongan default (contoh; sesuaikan aturan TPP/TKD Kotabaru)
  insert into pengaturan_potongan (instansi_id, jenis, menit_dari, menit_sampai, persen_potongan) values
    (v_instansi, 'terlambat', 1, 30, 0.50),
    (v_instansi, 'terlambat', 31, 60, 1.00),
    (v_instansi, 'terlambat', 61, 90, 1.25),
    (v_instansi, 'terlambat', 91, null, 2.50),
    (v_instansi, 'tidak_hadir', 0, null, 5.00);
end $$;

-- ============ [0003_rls.sql] ============
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
drop policy if exists "pegawai lihat data sendiri" on pegawai;
create policy "pegawai lihat data sendiri"
  on pegawai for select
  using (auth_user_id = auth.uid());

-- Admin unit / super admin: lihat pegawai di unit yang diampu
drop policy if exists "admin lihat pegawai unitnya" on pegawai;
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
drop policy if exists "pegawai lihat presensi sendiri" on presensi;
create policy "pegawai lihat presensi sendiri"
  on presensi for select
  using (
    pegawai_id in (select id from pegawai where auth_user_id = auth.uid())
  );

-- Presensi: admin unit lihat presensi pegawai unitnya
drop policy if exists "admin lihat presensi unitnya" on presensi;
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
drop policy if exists "pegawai lihat enrollment sendiri" on pegawai_face_enrollment;
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

-- ============ [0004_rls_hardening.sql] ============
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

-- ============ [0005_kiosk_device_binding.sql] ============
-- =========================================================
-- QRensi — Kiosk device binding (0005)
-- Mengikat 1 device_secret ke 1 perangkat fisik. Perangkat pertama yang
-- memakai secret akan "mengunci" dirinya; perangkat lain ditolak sampai
-- admin melakukan reset (yang mengosongkan binding).
-- =========================================================

alter table perangkat_kiosk
  add column if not exists device_instance_id text,   -- id acak dari localStorage kiosk
  add column if not exists terikat_at timestamptz;    -- kapan pertama terikat

-- ============ [0006_sanggahan.sql] ============
-- =========================================================
-- QRensi — Sanggahan / Izin pegawai (0006)
-- Pegawai mengajukan izin/sakit/cuti/dinas/sanggahan; admin memutuskan.
-- Blueprint §7.2 & §13 (mekanisme sanggahan manusia).
-- =========================================================

create table if not exists sanggahan (
  id uuid primary key default gen_random_uuid(),
  pegawai_id uuid not null references pegawai(id) on delete cascade,
  instansi_id uuid not null references instansi(id) on delete cascade,
  jenis text not null check (jenis in ('sanggahan','izin','sakit','cuti','dinas_luar')),
  tanggal date not null,
  alasan text not null,
  lampiran_path text,                    -- path di Storage bucket privat 'sanggahan'
  status text not null default 'pending' check (status in ('pending','disetujui','ditolak')),
  catatan_admin text,
  reviewed_by uuid references pegawai(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_sanggahan_pegawai on sanggahan (pegawai_id, created_at desc);
create index if not exists idx_sanggahan_instansi_status on sanggahan (instansi_id, status);

-- Akses hanya via server (service_role). Default deny untuk client.
alter table sanggahan enable row level security;

-- ============ [0007_push_subscription.sql] ============
-- =========================================================
-- QRensi — Web Push subscriptions (0007)
-- Menyimpan langganan Web Push per akun (pegawai/admin).
-- =========================================================

create table if not exists push_subscription (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_sub_user on push_subscription (auth_user_id);

-- Akses hanya via server (service_role). Default deny untuk client.
alter table push_subscription enable row level security;

-- ============ [0008_data_pribadi_pegawai.sql] ============
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

-- ============ [0009_status_izin_presensi.sql] ============
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

-- ============ [0010_foto_profil.sql] ============
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

-- ============ [0011_pengaturan_aplikasi.sql] ============
-- =========================================================
-- QRensi — Pengaturan aplikasi / white-label (0011)
--
-- Membuat identitas aplikasi dapat diubah tanpa menyentuh kode, agar sumber
-- kode yang sama bisa dipakai kabupaten lain, perusahaan, sekolah, atau
-- organisasi mana pun. Tabel ini SINGLETON (hanya 1 baris, id tetap).
-- =========================================================

create table if not exists pengaturan_aplikasi (
  id boolean primary key default true check (id),   -- kunci singleton: selalu true
  nama_aplikasi text not null default 'QRensi',
  tagline text not null default 'Presensi berbasis QR & verifikasi wajah',
  nama_organisasi text not null default 'Organisasi Anda',
  singkatan text not null default 'QR',             -- fallback saat logo belum ada
  warna_brand text not null default '#155e9c',      -- hex; dipakai untuk tema & PWA
  logo_path text,                                   -- path di bucket privat 'branding'
  timezone text not null default 'Asia/Makassar',
  kontak_bantuan text,                              -- email/no. HP admin utk pegawai
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Baris tunggal (idempoten).
insert into pengaturan_aplikasi (id) values (true) on conflict (id) do nothing;

-- Akses hanya lewat server (service_role). Default deny untuk client.
alter table pengaturan_aplikasi enable row level security;


-- =========================================================================
--  SELESAI
--  Verifikasi cepat (opsional) — jalankan terpisah:
--    select count(*) as tabel from information_schema.tables
--    where table_schema='public';
--  Harus ada ±14 tabel.
-- =========================================================================
