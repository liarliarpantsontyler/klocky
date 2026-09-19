-- Run in Supabase Dashboard → SQL → New query (or via Supabase CLI migrate).

create table if not exists public.user_sync (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_sync enable row level security;

create policy "user_sync_select_own"
  on public.user_sync
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_sync_insert_own"
  on public.user_sync
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_sync_update_own"
  on public.user_sync
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_user_sync_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_sync_updated_at on public.user_sync;
create trigger user_sync_updated_at
  before update on public.user_sync
  for each row
  execute function public.set_user_sync_updated_at();
