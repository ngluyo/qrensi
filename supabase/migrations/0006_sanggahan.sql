-- =========================================================
-- QRensi — Sanggahan / Izin pegawai (0006)
-- Pegawai mengajukan izin/sakit/cuti/dinas/sanggahan; admin memutuskan.
-- Blueprint §7.2 & §13 (mekanisme sanggahan manusia).
-- =========================================================

create table sanggahan (
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
create index idx_sanggahan_pegawai on sanggahan (pegawai_id, created_at desc);
create index idx_sanggahan_instansi_status on sanggahan (instansi_id, status);

-- Akses hanya via server (service_role). Default deny untuk client.
alter table sanggahan enable row level security;
