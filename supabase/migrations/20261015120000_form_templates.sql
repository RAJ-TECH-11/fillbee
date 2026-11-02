-- Step 5: admins, form templates aur PDF storage
-- Apply with: npx supabase db push

-- 1. Admins: jin users ki id is table mein hai, wahi admin panel use kar sakte hain.
--    Admin banane ka kaam sirf SQL se hota hai (app se koi khud admin nahi ban sakta).
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
grant select on public.admins to authenticated;

-- User sirf ye dekh sakta hai ki wo khud admin hai ya nahi.
create policy "Users can see their own admin row"
  on public.admins for select to authenticated
  using ((select auth.uid()) = user_id);

-- Policies mein baar-baar use hone wala check.
-- security definer: function admins table ko RLS ke bina padhta hai,
-- lekin sirf current user ke liye true/false lautata hai.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. Form templates: har PDF form ki details.
--    field_map: { "PDF field ka naam": "profile key" ya null (mat bharo) }
create table if not exists public.form_templates (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 3 and 120),
  description  text not null default '' check (char_length(description) <= 300),
  storage_path text not null unique,
  field_map    jsonb not null default '{}'::jsonb
               check (jsonb_typeof(field_map) = 'object'),
  is_published boolean not null default false,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.form_templates enable row level security;
grant select, insert, update, delete on public.form_templates to authenticated;

-- Logged-in users sirf published forms dekhte hain, admin sab.
create policy "Users can read published templates"
  on public.form_templates for select to authenticated
  using (is_published or (select public.is_admin()));

create policy "Admins can create templates"
  on public.form_templates for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update templates"
  on public.form_templates for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete templates"
  on public.form_templates for delete to authenticated
  using ((select public.is_admin()));

drop trigger if exists form_templates_set_updated_at on public.form_templates;
create trigger form_templates_set_updated_at
  before update on public.form_templates
  for each row execute function public.set_updated_at();

-- 3. Storage bucket: private, sirf PDF, max 4 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-templates', 'form-templates', false, 4194304, array['application/pdf'])
on conflict (id) do nothing;

-- Blank forms koi bhi logged-in user padh sakta hai (bharne ke liye).
create policy "Logged-in users can read form PDFs"
  on storage.objects for select to authenticated
  using (bucket_id = 'form-templates');

create policy "Admins can upload form PDFs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'form-templates' and (select public.is_admin()));

create policy "Admins can update form PDFs"
  on storage.objects for update to authenticated
  using (bucket_id = 'form-templates' and (select public.is_admin()));

create policy "Admins can delete form PDFs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'form-templates' and (select public.is_admin()));
