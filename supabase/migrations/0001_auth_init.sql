-- PG Hunter — auth + user data bootstrap.
--
-- Run this once against the Supabase project (SQL editor, or `supabase db push`
-- if using the CLI) BEFORE enabling the Google provider at
-- Authentication → Providers. It creates the user-data tables, auto-creates a
-- profile row on signup, and locks everything down with Row Level Security.

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth.users row, created automatically on signup.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  college_slug text,
  role text not null default 'student' check (role in ('student', 'owner')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Saved PGs: property ids (mock data ids during Phase 1) a student shortlists.
-- ---------------------------------------------------------------------------
create table if not exists public.saved_pgs (
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create index if not exists saved_pgs_user_idx on public.saved_pgs (user_id);

-- ---------------------------------------------------------------------------
-- Leads: enquiries students send from a listing page.
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  property_id text not null,
  student_id uuid references auth.users (id) on delete set null,
  source text not null default 'listing',
  budget text,
  move_in_month text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists leads_property_idx on public.leads (property_id);
create index if not exists leads_student_idx on public.leads (student_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — every user can only see/touch their own data.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.saved_pgs enable row level security;
alter table public.leads enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "saved_select_own" on public.saved_pgs
  for select using (auth.uid() = user_id);
create policy "saved_insert_own" on public.saved_pgs
  for insert with check (auth.uid() = user_id);
create policy "saved_delete_own" on public.saved_pgs
  for delete using (auth.uid() = user_id);

create policy "leads_insert_auth" on public.leads
  for insert with check (auth.uid() = student_id);
create policy "leads_select_own" on public.leads
  for select using (auth.uid() = student_id);
