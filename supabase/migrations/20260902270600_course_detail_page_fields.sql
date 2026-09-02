-- Small additive columns needed to match the Rate-My-Module-style course
-- detail page layout: a course description (the top card), an official
-- source link (seeded alongside the professor/course data — the research
-- prompt already collects a source_url per record), a professor honorific
-- ("Dr"/"Prof", shown next to their name), and whether a linked professor
-- is *the* module coordinator vs. just another teacher of it (our current
-- seeding has no way to distinguish these yet, so it defaults to true —
-- refine this once real seed data distinguishes roles).
alter table public.courses
  add column description text,
  add column source_url text;

alter table public.professors
  add column title text,
  add column source_url text;

alter table public.professor_courses
  add column is_coordinator boolean not null default true;
