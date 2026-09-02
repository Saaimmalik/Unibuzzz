-- Tenant table. One row per participating university. `email_domains` drives
-- signup routing (see 20260902120500_auth_events.sql) so onboarding a new
-- university is a data change, never an application code change.
create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  email_domains text[] not null,
  primary_color text,
  logo_url text,
  status text not null default 'active' check (status in ('active', 'coming_soon')),
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.universities is
  'One row per tenant university. No university-specific logic should ever live in application code — only in this table.';
comment on column public.universities.email_domains is
  'Verified student email domains for this university, e.g. {ucdconnect.ie}. Used to resolve which university a signup belongs to.';
comment on column public.universities.features is
  'Per-university feature flags (e.g. {"marketplace": false}) to allow a soft launch with a subset of features.';

create index universities_email_domains_idx on public.universities using gin (email_domains);

alter table public.universities enable row level security;

-- Directory data (name, domains, branding) is not sensitive; anyone (even a
-- signed-out visitor on the signup screen) needs to read it to resolve which
-- university an email belongs to. No insert/update/delete policy is defined,
-- so only the service role (platform admin tooling) can write to this table.
create policy "universities are publicly readable"
  on public.universities for select
  using (true);
