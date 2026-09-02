-- Seed data for local/dev environments. Run automatically by `supabase db reset`.
insert into public.universities (name, slug, email_domains, primary_color, status)
values (
  'University College Dublin',
  'ucd',
  array['ucdconnect.ie'],
  '#F6BA24',
  'active'
)
on conflict (slug) do nothing;
