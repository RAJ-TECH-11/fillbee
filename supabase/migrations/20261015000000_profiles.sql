-- Step 3: profiles table
-- Apply with: npx supabase db push  (dashboard SQL Editor mein paste mat karo)

-- 1. Table: har user ki ek row. Saari details `data` (JSONB) mein.
--    JSONB isliye taaki naye fields (jaise "Blood Group") bina table badle jud sakein.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb
             check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Row Level Security: har user sirf apni row dekh/badal sake.
alter table public.profiles enable row level security;

-- "Automatically expose new tables" OFF hai, isliye logged-in users ko
-- khud permission deni padti hai. Bina login wale (anon) ko kuch nahi.
grant select, insert, update, delete on public.profiles to authenticated;

create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own profile"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 3. updated_at apne aap update ho jab bhi row badle.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
