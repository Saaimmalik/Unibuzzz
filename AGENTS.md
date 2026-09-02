# AGENTS.md — UniBuzzz

Context and working conventions for any AI agent (or developer) working on this repo. This file answers "what was asked for and how has work on this been done so far" — for "what's actually built right now and what's next", read **`HANDOFF.md`** (repo root). Read both before making changes.

## Original product requirements (verbatim, from the founder)

This is the exact initial prompt that started this project. Every architectural decision in the codebase traces back to something in here — when in doubt about intent, re-read this section rather than guessing.

> I want to plan and build **UniBuzzz**, a university-only social platform, initially for **UCD students**. The concept combines an Instagram/Facebook-style social feed where students can post, upload photos, like, comment and interact; Reddit-style communities and discussion threads; and a UCD-only Facebook Marketplace where students can buy/sell items and message each other. Users must register and verify a **@ucdconnect.ie** email address before accessing the platform. Although we're starting with UCD, design the architecture so universities can easily be added later rather than hard-coding UCD throughout the system. Include user profiles, search, notifications, messaging, reporting/blocking, moderation and an admin dashboard.
>
> I am currently building the website first using **React + TypeScript**, but I eventually want a **React Native mobile app**, so structure the architecture, backend, API, business logic and components with that future transition in mind. The website should be **mobile-first, fully responsive and a Progressive Web App (PWA)** so students can use it almost like a native app from their phone. Recommend an appropriate modern tech stack and database architecture, and keep the project scalable but practical for an initial student startup.
>
> Add a dedicated **Reviews** section containing **Rate My Professor** and **Rate My Course**. Every professor and course should have a dedicated page where verified students can leave a **1–5 star rating and written review**, with ratings, review counts and recent reviews displayed. Students should be able to search and filter professors/courses, and prominently show **Trending / Most Reviewed Professors and Courses**, with trending based on a sensible combination of recent activity, review count and engagement rather than simply the highest rating. Professor/course data should be managed centrally so users cannot create duplicates. Include appropriate moderation/reporting because reviews must prevent harassment, abuse, spam and personal information.
>
> The uploaded UniBuzz bee logo is the official brand reference. Use **yellow/orange as the primary brand colour**, with **purple and black as secondary colours**, and create a modern, clean, energetic student-focused design system around these colours. Plan the main navigation, key screens, database structure, authentication, security, moderation and MVP roadmap. **Do not start coding yet** — first give me a concise but complete product, UX and technical architecture plan, including what should be MVP vs later phases.

Follow-up asks made during the build (not in the original prompt, but binding scope additions): search across posts _and_ profiles including **email match**; a "Refer a friend" link to the signup page; the UniBuzzz logo in the nav should be clickable and route home.

## What happened with that prompt

A full architecture plan was written first (per the "do not start coding yet" instruction), then approved, then built incrementally. That plan document — product pillars, full nav/screen list, original DB schema sketch, MVP-vs-later-phase breakdown, the 15-step build sequence — lives at `/Users/saaim/.claude/plans/i-want-zany-llama.md`. **Read it if you need the "why" behind a decision that HANDOFF.md states as a fact.**

Three clarifying decisions were made explicitly with the founder before building anything, and they're load-bearing for everything since:

1. **Backend = Supabase** (Postgres + Auth + Storage + Realtime), not a hand-rolled Node API. All business logic lives in Postgres (RLS policies, triggers, SQL functions), not an application server.
2. **Budget = free-tier first.** Every tech choice optimizes for $0 to launch.
3. **Monorepo from day one** (Turborepo + pnpm workspaces), with `packages/shared` holding everything platform-agnostic specifically so a React Native app can reuse it later without a rewrite.

## Working conventions established during the build

These aren't arbitrary style preferences — each one exists because of something that actually happened this session. Follow them for consistency, and read the "why" before deviating.

**Feature-folder pattern**: every domain (`feed`, `communities`, `messaging`, `profile`, `search`, `marketplace`) is `apps/web/src/features/<domain>/{api.ts,hooks.ts}` — `api.ts` holds raw Supabase calls (typed, no React), `hooks.ts` wraps them in React Query. Pages (`apps/web/src/pages/`) are thin — they call hooks and render, they don't call Supabase directly. Keep new features in this shape.

**Immutable content, status-only updates**: posts, comments, messages, and listings all follow the same rule — content fields (body/title/description/price/etc.) can never be changed after creation, enforced by a `BEFORE UPDATE` trigger in Postgres, not just in the UI. The only mutable thing is a status/lifecycle field (`deleted_at`, `read_at`, `status`). This was a deliberate, repeated choice for consistency and simplicity, not a limitation of the tooling. Follow it for any new content type unless there's a real product reason not to (there wasn't one yet).

**RLS is the security boundary, not the frontend.** Every table has Row Level Security enabled with real policies; the frontend never assumes it's the only client. Tenant isolation (`university_id = current_university_id()`), ownership, and role checks are enforced in Postgres. See `supabase/migrations/20260902120300_auth_helpers.sql` for the `SECURITY DEFINER` helper-function pattern used to avoid RLS recursion (`current_app_user_id()`, `is_staff()`, etc.) — reuse these helpers, don't reinvent per-feature equivalents.

**⚠️ The single most important gotcha, worth repeating here too**: Postgres RLS requires an `UPDATE`'s _resulting_ row to still pass the table's `SELECT` policy, not just its `UPDATE` policy. A `SELECT` policy that hides soft-deleted rows will silently block the actor's own soft-delete `UPDATE` unless they're exempted (`author_id = current_app_user_id()` OR'd in, etc.). This was discovered the hard way on `posts`, fixed there and in `comments`, and pre-empted correctly from the start on `listings`. Check this on every new soft-delete-shaped table (Reviews will need it).

**Deferred-column pattern**: if table B logically needs a FK to table A, but A doesn't exist yet, ship B without that column and `ALTER TABLE` it in once A exists. Used for `posts.community_id` and `conversations.listing_id`. Don't pre-add unenforced nullable FK columns speculatively — wait until the referenced table is real.

**Realtime tables must be added to the publication explicitly.** `supabase_realtime` starts empty on a fresh project. Forgetting to `alter publication supabase_realtime add table ...` for a new table means every `postgres_changes` subscription on it silently does nothing — no error, it just never fires. This bug existed undetected for three build steps before being caught. If you build something with live updates, verify it actually fires (a two-client test, not just "the code looks right") before considering it done.

**Verification discipline**: every migration in this repo was pushed to the _live_ Supabase project and exercised with real disposable test accounts created via direct SQL insert into `auth.users` (bcrypt password via `crypt()`, pre-confirmed `email_confirmed_at`) — not mocked, not assumed correct from reading the SQL. RLS policies were tested from multiple angles (owner, other same-university user, outsider) via real REST/RPC calls with real JWTs, and test data was deleted afterward every time. Keep this bar. `typecheck && lint && build` passing is necessary but not sufficient — it doesn't prove the RLS policy or trigger actually does what you think.

**Known tooling gotchas** (see HANDOFF.md §11 for full detail, repeating the headlines here since they're easy to hit again): `zod().default()` breaks `react-hook-form`'s resolver typing — seed defaults via `useForm`'s `defaultValues` instead; `packages/shared/src/supabase/database.types.ts` is hand-authored and every table needs `Relationships: [...]` (even empty) plus `Views: Record<string, never>` on the schema object, or `.rpc()` argument typing silently breaks.

**Design tokens have two sources of truth that must be kept in sync by hand**: `packages/shared/src/brand.ts` (TS) and the `@theme` block in `apps/web/src/index.css` (Tailwind v4 CSS-first config). Colors were sampled directly from the actual logo pixels (not guessed) — don't change them without re-sampling from `apps/web/public/brand/bee-logo.png`.

## Where things stand right now

Don't duplicate that here — **read `HANDOFF.md`**, section 2 ("Status at a glance") for the build-step checklist, section 10 for feature-by-feature detail, section 11 for known issues, section 13 for the recommended next feature and exactly what it needs. Keep both files updated together when you finish a feature: HANDOFF.md's status table/feature section, and this file only if a _convention_ changes (not for routine feature completions).
