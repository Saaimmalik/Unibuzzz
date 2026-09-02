# UniBuzzz — Handoff

Read this file first. It reflects the actual codebase as of **2026-09-02** (last updated after Marketplace shipped), verified against the repo, not written from memory. If something here disagrees with the code, trust the code and fix this file. See also `AGENTS.md` (repo root) for the original product requirements verbatim and session-wide working conventions.

## 1. Vision

UniBuzzz is a university-only social platform, launching first at **UCD** (email domain `ucdconnect.ie`), combining: an Instagram/Facebook-style feed, Reddit-style communities, a marketplace, DMs, and a Rate My Professor / Rate My Course reviews section. Architecture is explicitly designed so a second university is a **data change** (a row in `universities`), never a code change. Building web first (React + TS PWA), with a React Native app planned later reusing the same backend and a shared TypeScript package.

Full original product/UX/architecture plan (nav, MVP phases, design rationale) lives at `/Users/saaim/.claude/plans/i-want-zany-llama.md` — read it for the "why", this file is the "what's actually built."

## 2. Status at a glance

| Build step                                        | Status                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1. Repo/tooling scaffold                          | ✅ done                                                                                       |
| 2. Supabase connection                            | ✅ done                                                                                       |
| 3. Core schema + RLS (universities, users)        | ✅ done                                                                                       |
| 4. Auth + email verification                      | ✅ done                                                                                       |
| 5. Brand shell / design system / PWA              | ✅ done                                                                                       |
| 6. Social feed (posts/comments/likes)             | ✅ done                                                                                       |
| 7. Profiles (edit + avatar)                       | ✅ done                                                                                       |
| 8. Communities (Reddit-style, up/downvote)        | ✅ done                                                                                       |
| 9. Messaging (DMs, realtime)                      | ✅ done                                                                                       |
| Search (posts + people, incl. email match)        | ✅ done (bonus, done alongside step 6/7)                                                      |
| 10. Marketplace                                   | ✅ done — listings, buyer/seller chat (reuses messaging), status transitions                  |
| 11. Reviews (Rate My Professor/Course)            | ❌ not started — `ReviewsPage.tsx` is a placeholder                                           |
| 12. Unified search                                | ✅ effectively done (posts + people + listings); would extend to reviews later                |
| 13. Notifications                                 | ❌ not started — `NotificationsPage.tsx` is a placeholder                                     |
| 14. Reporting/blocking/moderation/admin dashboard | ❌ not started at all                                                                         |
| 15. PWA/launch polish                             | Partial — manifest/icons/service worker work, no offline-first tuning or Lighthouse pass done |

**⚠️ Git state**: only **one commit** exists (`initial commit setup supabase`). Everything from step 4 onward (auth, brand shell, feed, profiles, communities, messaging, marketplace, search, the Realtime publication fix) is **uncommitted** in the working tree. First thing to do in a new session: check `git status`, review the diff, and commit in sensible chunks (or one commit) before doing anything else — don't lose this work.

## 3. Tech stack (as actually installed, not as planned)

- **Monorepo**: pnpm workspaces + Turborepo (`turbo.json`, `pnpm-workspace.yaml`)
- **Frontend**: React 19, TypeScript ~6.0, Vite 8, in `apps/web`
- **Styling**: Tailwind CSS v4 (CSS-first `@theme` config in `apps/web/src/index.css`, not a `tailwind.config.js`)
- **Routing**: react-router-dom v7
- **Data/state**: `@tanstack/react-query` v5 for all server state; `AuthProvider`/`useAuth` (React context) for session/profile
- **Forms**: react-hook-form + zod (`@hookform/resolvers`)
- **Icons**: lucide-react
- **PWA**: vite-plugin-pwa (generates manifest + service worker at build)
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime). No custom API server — all business logic lives in Postgres (RLS policies, triggers, SQL functions) or the frontend.
- **Lint**: oxlint (not ESLint). **Format**: Prettier.
- **Shared package**: `packages/shared` (`@unibuzzz/shared`) — types, Zod schemas, the Supabase client factory, brand tokens, formatting helpers. Consumed directly as TS source (no build step) by `apps/web`, and will be consumed the same way by a future `apps/mobile`.

Root scripts (`pnpm <script>` from repo root, runs across the monorepo via Turborepo): `dev`, `build`, `lint`, `typecheck`, `format`, `format:check`.

## 4. Repo layout

```
apps/web/                    React PWA
  src/
    lib/                     supabase client, auth-context/AuthProvider, query client, search helpers
    components/               AppShell (nav shell), Avatar, AuthLayout, ProtectedRoute, ComingSoon, LoadingScreen
    features/                 one folder per domain: feed/, communities/, messaging/, profile/, search/, marketplace/
                               each has api.ts (Supabase calls) + hooks.ts (React Query wrappers)
    pages/                    route-level components, one per route in App.tsx
  public/brand/bee-logo.png   official logo asset
  public/icons/               generated PWA icons (see §7)
packages/shared/src/
  supabase/database.types.ts  hand-authored Database type (Tables/Views/Functions) — MUST be kept in sync
                               with migrations by hand; there's no live project to `supabase gen types` against
                               conveniently mid-session, though that command works once linked
  supabase/client.ts          createSupabaseClient(config) factory (platform-agnostic, for future RN reuse)
  types.ts                    app-facing types built from Database (PostWithAuthor, FeedPost-adjacent types, etc.)
  schemas/                    Zod schemas per domain (auth, post, profile, community, message, listing)
  brand.ts                    brand color tokens sampled from the logo (single source of truth)
  format.ts                   formatRelativeTime, slugify
supabase/
  migrations/                 20 files, chronological, see §5
  config.toml                 project_id = "Unibuzzz"
```

## 5. Database & architecture

**Multi-tenancy**: every user-generated table has `university_id`. RLS policies key off `current_university_id()` (a `SECURITY DEFINER` SQL function that looks up the caller's own row) — never a hardcoded university. Onboarding a second school is inserting a row into `universities` with its email domain(s).

**Tables** (chronological via migrations in `supabase/migrations/`):

- `universities`, `users` — core tenant + profile tables. `users.role` (student/moderator/admin), `users.status` (active/suspended/banned) exist in schema but there's **no moderation UI yet** to act on them.
- `posts`, `post_media`, `comments`, `reactions` — feed. `reactions` is **polymorphic** (`target_type`: post/comment, `type`: like/upvote/downvote) — shared by feed likes AND community voting, not two separate systems. `posts.like_count`/`comment_count` are **trigger-maintained**, not computed on read.
- `communities`, `community_members` — Reddit-style. `posts.community_id` (nullable) was added later via `ALTER TABLE` once communities existed. `public` communities are readable without joining; `restricted` ones require membership to read; **posting into any community always requires membership** regardless of type.
- `conversations`, `conversation_participants`, `messages` — DMs _and_ marketplace chat (same tables, `conversations.type` distinguishes them). Conversations can only be created via RPC — `start_dm_conversation(p_other_user_id)` (dedupes per pair of people, whichever direction you message from) or `start_marketplace_conversation(p_listing_id)` (dedupes per buyer+seller+**listing**, since a buyer messaging the same seller about a different item should get a separate thread). `conversations.listing_id` (nullable FK to `listings`) was added via `ALTER TABLE` once `listings` existed.
- `listings`, `listing_media` — marketplace. Same immutable-content convention as posts/comments/messages: title/description/price/category/condition can't be edited after creation, only `status` transitions (`active` → `sold`/`removed`, `sold` → `active` to relist). `category` and `condition` are fixed check-constraint enums (see `packages/shared/src/schemas/listing.ts` for the values) — adding a new one needs a migration, not just a frontend change.

**Deferred-column pattern** (used three times now — expect it again for Reviews if a table there ever needs to point at something not yet built): when table B needs to reference table A but A doesn't exist yet, ship B without the FK column, then `ALTER TABLE ... ADD COLUMN` once A exists. Used for `posts.community_id` and `conversations.listing_id`.

**Key SQL helper functions** (all `SECURITY DEFINER`, used inside RLS policies to avoid recursion — see comments in `20260902120300_auth_helpers.sql`):
`current_app_user_id()`, `current_university_id()`, `current_app_role()`, `is_staff()`, `is_active_user()`, `is_verified_user()`, `is_conversation_participant(id)`.

**RPCs callable from the client**: `resolve_university_for_email(email)`, `is_username_available(username)` (both pre-signup checks), `start_dm_conversation(other_user_id)`, `start_marketplace_conversation(listing_id)`.

**Storage buckets**: `post-media` and `listing-media` (both private, signed URLs, path `{university_id}/{owner_id}/{uuid}.ext`), `avatars` (**public**, deliberate tradeoff for simplicity — see comment in `20260902230000_avatars_storage.sql` — path `{university_id}/{user_id}/avatar.ext`, upsert overwrites).

**Realtime**: uses Supabase's `postgres_changes`. The `supabase_realtime` publication starts **empty** on a fresh project — tables must be explicitly added (`20260902240000_realtime_publication.sql` covers posts/comments/communities/community_members/conversations/messages; `20260902260000_marketplace.sql` adds `listings`). **If you add a new table that needs live updates, you must add it to this publication or subscriptions will silently never fire** — this exact bug existed undetected through steps 6–8 until caught and fixed in step 9. Realtime respects each table's RLS per subscriber.

## 6. Auth & UCD verification

- Supabase Auth (email/password). Signup flow: client pre-checks the email domain via `resolve_university_for_email()` RPC (friendly error) _before_ calling `supabase.auth.signUp()`.
- The real enforcement is a Postgres trigger (`handle_new_auth_user` in `20260902130000_auth_signup_trigger.sql`) on `auth.users` INSERT: resolves `university_id` from the email domain, and **raises an exception that aborts the whole signup transaction** if the domain isn't in any `universities.email_domains` array. Currently only `ucdconnect.ie` is seeded (`supabase/seed.sql`).
- Username + display_name are passed via `signUp({ options: { data: {...} } })` and read from `raw_user_meta_data` by the trigger.
- `email_verified_at` on `public.users` is kept in sync with Supabase's `email_confirmed_at` via a second trigger (`20260902130100_email_verification_sync.sql`).
- Frontend gating: `ProtectedRoute`/`PublicOnlyRoute` (`apps/web/src/components/ProtectedRoute.tsx`) check `session` + `isVerified` (from `useAuth()`).
- **Supabase dashboard setup required, not code**: Authentication → URL Configuration → Redirect URLs must include your dev/prod origins (e.g. `http://localhost:5173/**`) or verification/reset email links won't redirect correctly.

## 7. Branding / design system

- Colors are **sampled directly from the logo pixels** (not guessed) — see `packages/shared/src/brand.ts`: yellow `#F6BA24` (primary), orange `#E8960F` (derived accent), purple `#6529C9` + purple-light `#905DDE` (secondary), ink `#0A0A0A` (near-black, used as primary text color). Tailwind theme tokens mirror these in `apps/web/src/index.css` under `@theme` (`brand-yellow`, `brand-orange`, `brand-purple`, `brand-purple-light`, `brand-ink`) — **the two files must be kept in sync by hand**, CSS can't import the TS constant.
- Font: Inter (Google Fonts, loaded via `@import` in `index.css`).
- Neutrals: Tailwind's built-in `stone` scale (no custom gray palette).
- Nav shell (`AppShell.tsx`): bottom tab bar on mobile (Feed/Communities/Marketplace/Reviews/Alerts), left sidebar on desktop (`md:` breakpoint), logo top-left links home, search/messages/profile icons in the top bar.
- Dark mode: **not implemented**. Explicitly deferred per the original plan (structure allows it later, not shipped).

## 8. PWA / responsive

- `vite-plugin-pwa` configured in `apps/web/vite.config.ts`: manifest (name, brand-yellow theme color, icons), service worker (`generateSW` mode), `registerType: "autoUpdate"`.
- Icons generated once from the logo via a local Pillow script (not checked into repo as a script — one-off), output at `apps/web/public/icons/` (favicon 16/32, apple-touch-icon, standard + maskable 192/512).
- Mobile-first Tailwind layout throughout (`md:` breakpoint switches mobile → desktop chrome). No dedicated tablet breakpoint tuning done.
- **Not done**: offline-first caching strategy beyond Workbox defaults, install-prompt UX, Lighthouse PWA audit.

## 9. Future React Native compatibility

- `packages/shared` holds everything platform-agnostic on purpose: Zod schemas, `Database` types, `createSupabaseClient(config)` (takes URL/key as params rather than reading `import.meta.env` itself, specifically so a future Expo app can supply its own env access).
- `apps/web`-specific things (React Router, Tailwind, DOM APIs, `File`/`URL.createObjectURL` for image previews) are NOT in `packages/shared` and will need RN equivalents.
- No `apps/mobile` exists yet. `packages/ui` (cross-platform components) was deliberately not created yet either — YAGNI until RN work actually starts.

## 10. Feature status in detail

**Feed** (`features/feed/`): text + single-photo posts, like (heart), comment (flat, non-threaded — `comments.parent_comment_id` column exists for future threading but unused), soft-delete own post (trigger blocks editing — only `deleted_at` may change). Realtime live updates. `PostCard` has a `mode="like" | "vote"` prop reused by both the main feed and communities.

**Communities** (`features/communities/`): create (auto-derives slug, retries on collision), browse/list, join/leave, public vs restricted visibility, up/downvote via the shared `reactions` table (switching vote = delete+insert, not update). `PostComposer` takes an optional `communityId` prop to post into a community vs. the main feed.

**Profiles**: own profile editable (display name, bio, major, grad year, avatar upload); other users' profiles viewable read-only at `/u/:username`. `useAuth().refreshAppUser()` exists specifically to refresh the cached profile after an edit (AuthProvider doesn't use React Query internally).

**Messaging** (`features/messaging/`): 1:1 DMs only (no group chat), inbox with unread badges + last-message preview, realtime chat thread, read receipts (recipient-only, enforced by RLS). Reachable via a "Message" button on `PublicProfilePage`.

**Marketplace** (`features/marketplace/`): create a listing (title, description, price, category, condition, up to 4 photos), browse with category filter, "My listings" management tab (shows active/sold/removed, unlike public browse which is active-only), listing detail page with an image gallery, mark sold / remove / relist (seller only), "Message seller" → `start_marketplace_conversation` → lands in the existing `ConversationPage`. Inbox (`MessagesPage`) shows a 🏷️ listing-title tag on marketplace threads so they're visually distinct from DMs. Listing search wired into the unified `SearchPage`. No edit-after-posting (see the immutable-content convention above) and no offer/bidding system — just list, chat, mark sold.

**Reviews, Notifications, Reporting/Blocking, Moderation queue, Admin dashboard**: **none of this exists.** Pages are literally `<ComingSoon icon=... title=... description=... />` placeholders (Reviews only — Marketplace is now real). No schema, no RLS, no UI beyond the placeholder for any of these.

**Search** (`features/search/` + `features/marketplace/`): posts (body ILIKE, trigram-indexed), people (username/display_name/**email** ILIKE — explicitly requested, all three are searchable), and listings (title ILIKE). Debounced (300ms), min 2 chars. Person/listing search is deliberately separate single-column queries merged client-side rather than one `.or()` filter, to avoid PostgREST filter-syntax injection from special characters in a search query.

**Refer a friend**: a link to `/signup` on the Profile page — no referral code/tracking, just a link, per explicit scope request.

## 11. Known issues / gotchas for whoever picks this up

- **Uncommitted work** — see §2. Deal with this first.
- **Bundle size warning** at build time (`chunks are larger than 500 kB`) — no code-splitting done yet. Fine for now, revisit if it becomes a real problem (route-based `lazy()` would be the fix).
- **Known false-positive lint warning**: oxlint's React Compiler ref-lint rule flags `PostComposer.tsx`'s `handleSubmit(onSubmit)` line as "cannot access refs during render" — investigated, it's a false positive from how the rule interacts with react-hook-form's `handleSubmit`; the ref (`fileInputRef`) is genuinely only touched inside event handlers. Left as-is, don't waste time re-chasing it.
- **RLS + UPDATE gotcha** (bit us once, will bite again if forgotten): Postgres RLS requires an UPDATE's _resulting_ row to still satisfy the table's SELECT policy, not just the UPDATE policy. This means a SELECT policy that hides soft-deleted rows will **silently block the very UPDATE that soft-deletes them** unless the actor (e.g. the post's author) is exempted in the SELECT policy too. See the fix in `posts`/`comments` SELECT policies (`author_id = current_app_user_id()` is OR'd in). `listings` was built with this pre-empted from the start (`seller_id = current_app_user_id()` OR'd into its SELECT policy) and verified live — a seller marking their own listing `removed` works correctly. Keep watching for this on every future soft-delete-shaped feature (e.g. reviews).
- **zod `.default()` breaks react-hook-form's resolver typing** — don't use `.default()` in a schema consumed by `useForm<T>()`; seed the default via `useForm`'s `defaultValues` instead. Hit this building the community-creation form; see comment in `packages/shared/src/schemas/community.ts`.
- **`Database` type structural requirements**: `packages/shared/src/supabase/database.types.ts` is hand-authored (no live-generated version has been produced yet). Every table needs `Relationships: [...]` (even if `[]`) and the schema object needs `Views: Record<string, never>` — omitting either silently breaks `.rpc()` argument typing in a confusing way (discovered the hard way; see git history / this session's transcript if it recurs). Once things stabilize, consider running `supabase gen types typescript --linked` to replace this file with a generated one and diff for drift.
- **Avatar bucket is public** (not signed URLs) — intentional tradeoff, documented in the migration, but worth knowing if privacy requirements tighten later.
- No tests exist anywhere in the repo (no test runner installed). All verification so far has been: typecheck + lint + build + manual REST/RPC calls against the live Supabase project with disposable test accounts (created and cleaned up each time) + a couple of live Realtime websocket checks. Nothing has been verified by clicking through the actual UI in a browser — that still needs to happen (no browser automation tool was available in-session).

## 12. Environment / setup

1. `pnpm install` from repo root.
2. Supabase project already exists and is linked: `supabase/config.toml` has `project_id = "Unibuzzz"`. Project ref: `oaseqfvqdlvuhkcvobbg` (this is not secret — it's in the project URL).
3. Copy `apps/web/.env.example` → `apps/web/.env` and fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (get from Supabase dashboard → Settings → API, or ask the project owner — **do not commit this file**, it's gitignored).
4. To run migrations against the live project: `pnpm dlx supabase login` (or use `SUPABASE_ACCESS_TOKEN` env var), `pnpm dlx supabase link --project-ref oaseqfvqdlvuhkcvobbg`, then `pnpm dlx supabase db push`.
5. `pnpm dev` (root) runs the web app via Turborepo. `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm format` all run across the monorepo.
6. No `.env` needed for `packages/shared` (it's consumed as source, no build step).
7. Supabase dashboard: Authentication → URL Configuration needs your dev origin in the redirect allowlist (see §6).

## 13. Recommended next steps

Marketplace (step 10) is done — see §5/§10. **Reviews is the next feature**, per the original build sequence. It's a fully independent domain (doesn't depend on marketplace/communities/messaging) — could be built in parallel by someone else if needed.

**Reviews / Rate My Professor & Rate My Course** (`step 11`):

- Schema per the original plan (§8 of the plan doc): `professors`, `courses`, `professor_courses`, `reviews`, `review_votes`, `entity_submissions` (for user-suggested new professors/courses, admin-approved to prevent duplicates). 1–5 star rating + written review, `trending_score` computed from recency + review count + engagement (not just average rating) — recompute via `pg_cron`, not on every read.
- **Data seeding — use this exact prompt** (as given, don't rephrase) with a research/browsing-capable agent to gather the initial UCD dataset before building the schema import:

  > Search the official UCD website and extract the academic data needed for UniBuzz's Rate My Course and Rate My Professor features. Find all available UCD modules/courses and their associated module coordinators/professors. For each, collect the module code, module name, school/subject, programme if available, academic year/semester if available, coordinator/professor name, and any relevant official details. Organise the data into a clean structured format suitable for importing into our database, and avoid duplicates. Only use official UCD sources and provide the source URL for each record.

  This has **not been run yet**. Run it, review the output for accuracy/licensing before importing, then seed `professors`/`courses` from it (via a migration or a one-off import script — don't let users freely create these rows, per the plan's "centrally managed, no duplicates" requirement — see `entity_submissions` for how user-suggested additions should flow instead).

- Moderation matters more here than elsewhere: reviews target named individuals. Plan for report-threshold auto-hide and a PII/harassment scrub check on submission (see plan §8) — this is real scope, not an afterthought.

**After that**, per the original sequence: Notifications (step 13, needs event sources from steps already built), then Reporting/Blocking/Moderation queue/Admin dashboard (step 14, deliberately last so it covers all content types at once), then PWA/launch polish (step 15).

**Also still open regardless of feature order**:

- Commit the current work (§2).
- Someone needs to actually click through the app in a real browser — no build step has substituted for this.
- No moderation/reporting exists yet even though `users.role`/`status` support it in schema — anything built for Reviews' harassment protection could reasonably be generalized into the real moderation system instead of being review-specific.
