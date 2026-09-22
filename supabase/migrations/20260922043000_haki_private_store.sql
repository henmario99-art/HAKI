-- HAKI private sales/inventory store.
-- Only the Supabase service role used by the backend may access this table.

create table if not exists public.haki_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.haki_store enable row level security;

revoke all on table public.haki_store from anon;
revoke all on table public.haki_store from authenticated;

comment on table public.haki_store is
  'Private HAKI sales, inventory and expenses. Data migrates lazily from Netlify Blobs.';
