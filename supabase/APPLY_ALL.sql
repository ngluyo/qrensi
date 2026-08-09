-- QRensi — combined migration (jalankan sekali di Supabase SQL Editor)

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
