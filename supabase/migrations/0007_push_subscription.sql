-- =========================================================
-- QRensi — Web Push subscriptions (0007)
-- Menyimpan langganan Web Push per akun (pegawai/admin).
-- =========================================================

create table push_subscription (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_push_sub_user on push_subscription (auth_user_id);

-- Akses hanya via server (service_role). Default deny untuk client.
alter table push_subscription enable row level security;
