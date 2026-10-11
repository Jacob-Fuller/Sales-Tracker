-- Profit Pocket: run once in a NEW Supabase project (separate from Roster Board
-- and Wisebyte). Supabase -> SQL Editor -> New query -> paste all of this -> Run.

-- 1. Each account's data, one row per user.
create table if not exists public.app_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz
);
alter table public.app_data enable row level security;

drop policy if exists "own data select" on public.app_data;
drop policy if exists "own data insert" on public.app_data;
drop policy if exists "own data update" on public.app_data;
drop policy if exists "own data delete" on public.app_data;
create policy "own data select" on public.app_data for select to authenticated using (auth.uid() = user_id);
create policy "own data insert" on public.app_data for insert to authenticated with check (auth.uid() = user_id);
create policy "own data update" on public.app_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data delete" on public.app_data for delete to authenticated using (auth.uid() = user_id);

-- 2. Lets a signed-in person permanently delete their own account from the app
--    (Apple requires this for apps that offer sign-up).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  delete from public.app_data where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 3. Free Premium for you and your family. Add or remove people any time in
--    Table Editor -> complimentary_access (one row per login email).
create table if not exists public.complimentary_access (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public.complimentary_access enable row level security;
drop policy if exists "read own complimentary access" on public.complimentary_access;
create policy "read own complimentary access" on public.complimentary_access
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));
revoke insert, update, delete on public.complimentary_access from anon, authenticated;

insert into public.complimentary_access (email, note) values
  ('YOUR-LOGIN-EMAIL@example.com', 'Owner')
on conflict (email) do nothing;
