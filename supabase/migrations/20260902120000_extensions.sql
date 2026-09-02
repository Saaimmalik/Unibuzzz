-- Core extensions used across the schema.
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- fuzzy search / duplicate detection (professors, courses, listings)
