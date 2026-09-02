-- Stored per-user (not just localStorage) so the choice follows a student
-- across devices, consistent with how the rest of the profile is handled.
-- Defaults to 'dark' per explicit founder request — new accounts land in
-- dark mode rather than following the system default.
alter table public.users
  add column theme_preference text not null default 'dark'
    check (theme_preference in ('light', 'dark', 'system'));
