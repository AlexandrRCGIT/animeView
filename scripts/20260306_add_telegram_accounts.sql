create table if not exists public.telegram_accounts (
  telegram_id bigint primary key,
  user_id text unique not null,
  username text null,
  first_name text null,
  last_name text null,
  photo_url text null,
  auth_date bigint not null,
  last_login_at timestamptz not null default now(),
  raw_payload jsonb null
);

create index if not exists idx_telegram_accounts_user_id on public.telegram_accounts(user_id);
