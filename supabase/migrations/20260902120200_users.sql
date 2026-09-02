-- App-level user profile, one row per auth.users row (Supabase Auth owns
-- credentials; this table owns everything app-specific).
create table public.users (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  email_verified_at timestamptz,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  major text,
  grad_year int,
  role text not null default 'student' check (role in ('student', 'moderator', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  created_at timestamptz not null default now()
);

comment on table public.users is
  'App-level user profile. university_id is set once at signup from the verified email domain and must never change afterwards (see users_protect_fields trigger).';
comment on column public.users.status is
  'active | suspended | banned — enforced app-wide by RLS on other tables checking this via public.is_active_user(), not just at login.';

create index users_university_id_idx on public.users (university_id);
create index users_username_trgm_idx on public.users using gin (username gin_trgm_ops);

alter table public.users enable row level security;
