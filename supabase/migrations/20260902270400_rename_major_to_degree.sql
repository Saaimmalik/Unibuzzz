-- "Major" isn't the right term for UCD/Irish universities (they use
-- "degree programme"). Renaming the column rather than just relabeling the
-- UI, since it's a free-text field with no seeded data to migrate.
alter table public.users rename column major to degree;
