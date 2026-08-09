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
create table instansi (
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

create table unit_kerja (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id) on delete cascade,
  nama text not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  radius_geofence_meter int,
  created_at timestamptz not null default now()
);

-- 2. POLA HARI KERJA (dibuat sebelum pegawai karena direferensi)
create table pola_hari_kerja (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id) on delete cascade,
  nama text not null,                                -- 'Senin-Jumat', 'Senin-Sabtu'
  hari_aktif int[] not null,                         -- 1=Minggu..7=Sabtu
  created_at timestamptz not null default now()
);

-- 3. PEGAWAI ---------------------------------------------------
create table pegawai (
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
create table jam_kerja_sesi (
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
create table sesi_absensi_harian (
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
create table perangkat_kiosk (
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
create table qr_token (
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
create index idx_qr_token_lookup on qr_token (token_value) where status = 'aktif';
create index idx_qr_token_kiosk_sesi on qr_token (perangkat_kiosk_id, sesi_absensi_harian_id);

-- 8. PRESENSI --------------------------------------------------
create table presensi (
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
create index idx_presensi_tanggal on presensi (sesi_absensi_harian_id, pegawai_id);

-- 9. VERIFIKASI LOG (audit trail granular) --------------------
create table presensi_verifikasi_log (
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
create table pegawai_face_enrollment (
  id uuid primary key default gen_random_uuid(),
  pegawai_id uuid not null references pegawai(id) unique,
  face_embedding vector(128),
  foto_storage_path text,                            -- bucket privat
  enrolled_at timestamptz not null default now(),
  enrolled_by uuid references pegawai(id)
);

-- 11. ADMIN UNIT KERJA (untuk RLS admin, dirujuk blueprint §11.1)
create table admin_unit_kerja (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  unit_kerja_id uuid not null references unit_kerja(id) on delete cascade,
  peran text not null default 'admin_unit'
    check (peran in ('admin_unit','super_admin')),
  created_at timestamptz not null default now(),
  unique (auth_user_id, unit_kerja_id)
);
create index idx_pegawai_unit on pegawai (unit_kerja_id, status_kepegawaian);

-- 12. PENGATURAN POTONGAN TUNJANGAN (berjenjang) --------------
create table pengaturan_potongan (
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
