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
