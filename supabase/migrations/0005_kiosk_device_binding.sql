-- =========================================================
-- QRensi — Kiosk device binding (0005)
-- Mengikat 1 device_secret ke 1 perangkat fisik. Perangkat pertama yang
-- memakai secret akan "mengunci" dirinya; perangkat lain ditolak sampai
-- admin melakukan reset (yang mengosongkan binding).
-- =========================================================

alter table perangkat_kiosk
  add column if not exists device_instance_id text,   -- id acak dari localStorage kiosk
  add column if not exists terikat_at timestamptz;    -- kapan pertama terikat
