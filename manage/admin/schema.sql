-- ============================================================================
-- ASHRAF VAULT — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Database > SQL Editor).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. FILES  (metadata only — the actual bytes live in Supabase Storage)
-- ----------------------------------------------------------------------------
create table if not exists public.files (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  storage_path     text not null unique,          -- e.g. "<user_id>/1699999999-resume.pdf"
  mime_type        text,
  size             bigint not null default 0,      -- bytes
  category         text not null default 'Miscellaneous',
  tags             text[] not null default '{}',
  is_favorite      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_accessed_at timestamptz,
  deleted_at       timestamptz                      -- null = active, set = in Trash
);

create index if not exists files_user_id_idx        on public.files (user_id);
create index if not exists files_category_idx        on public.files (user_id, category);
create index if not exists files_favorite_idx        on public.files (user_id, is_favorite) where is_favorite = true;
create index if not exists files_deleted_idx         on public.files (user_id, deleted_at);
create index if not exists files_created_idx         on public.files (user_id, created_at desc);
create index if not exists files_name_trgm_idx       on public.files using gin (name gin_trgm_ops);
create extension if not exists pg_trgm;

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_files_updated_at on public.files;
create trigger trg_files_updated_at
  before update on public.files
  for each row execute function public.set_updated_at();

alter table public.files enable row level security;

drop policy if exists "files_select_own" on public.files;
create policy "files_select_own" on public.files
  for select using (auth.uid() = user_id);

drop policy if exists "files_insert_own" on public.files;
create policy "files_insert_own" on public.files
  for insert with check (auth.uid() = user_id);

drop policy if exists "files_update_own" on public.files;
create policy "files_update_own" on public.files
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "files_delete_own" on public.files;
create policy "files_delete_own" on public.files
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. CATEGORIES (optional, lets custom categories carry an icon)
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  icon        text not null default 'folder',
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;

drop policy if exists "categories_all_own" on public.categories;
create policy "categories_all_own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.categories (user_id, name, icon)
select auth.uid(), c, i from (values
  ('Academic','book'), ('Research','flask-conical'), ('Career','briefcase'),
  ('Certificates','award'), ('Projects','folder-kanban'), ('Geophysics','waves'),
  ('Personal','user'), ('Finance','wallet'), ('Training','graduation-cap'),
  ('Miscellaneous','more-horizontal')
) as t(c,i)
where auth.uid() is not null
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 3. SHARE LINKS  (temporary, optionally password protected)
-- ----------------------------------------------------------------------------
create table if not exists public.file_shares (
  id            uuid primary key default gen_random_uuid(),
  file_id       uuid not null references public.files(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  password_hash text,                     -- null = no password
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz
);

create index if not exists file_shares_token_idx on public.file_shares (token);

alter table public.file_shares enable row level security;

drop policy if exists "shares_all_own" on public.file_shares;
create policy "shares_all_own" on public.file_shares
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- NOTE: resolving a share link for an anonymous visitor (checking token +
-- password + expiry, then minting a signed URL) must go through a Supabase
-- Edge Function using the service_role key — never expose service_role to
-- the browser. See README-ADMIN.md "Sharing" section.

-- ----------------------------------------------------------------------------
-- 4. ACTIVITY LOG
-- ----------------------------------------------------------------------------
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,              -- uploaded | downloaded | renamed | deleted | restored | shared | previewed | favorited
  file_name   text,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists activity_log_user_idx on public.activity_log (user_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "activity_select_own" on public.activity_log;
create policy "activity_select_own" on public.activity_log
  for select using (auth.uid() = user_id);

drop policy if exists "activity_insert_own" on public.activity_log;
create policy "activity_insert_own" on public.activity_log
  for insert with check (auth.uid() = user_id);

-- ============================================================================
-- 5. STORAGE BUCKET + POLICIES
-- Run this part too. The bucket is PRIVATE (public = false).
-- Files must be uploaded under a path prefixed by the owner's user id, e.g.
--   <user_id>/1699999999-resume.pdf
-- so the policies below can check ownership from the path.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('vault-files', 'vault-files', false)
on conflict (id) do nothing;

drop policy if exists "vault_select_own" on storage.objects;
create policy "vault_select_own" on storage.objects
  for select using (
    bucket_id = 'vault-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "vault_insert_own" on storage.objects;
create policy "vault_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'vault-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "vault_update_own" on storage.objects;
create policy "vault_update_own" on storage.objects
  for update using (
    bucket_id = 'vault-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "vault_delete_own" on storage.objects;
create policy "vault_delete_own" on storage.objects
  for delete using (
    bucket_id = 'vault-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- Done. Next steps live in README-ADMIN.md:
--   1. Enable Email auth provider, create your one admin account.
--   2. Copy your Project URL + anon key into admin/js/config.js (gitignored).
--   3. Deploy to Netlify and test.
-- ============================================================================
