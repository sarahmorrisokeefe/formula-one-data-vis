# Dashboard: Login + Saveable Layouts — Feature Plan

**Status:** Scoping draft. **No code yet** — please review and answer the open questions before any implementation work begins.

**Date:** 2026-05-07

---

## Goal

Let signed-in users save a personalized Dashboard home-page layout (which cards are shown, in what order) that persists across devices. Anonymous visitors continue to get a useful default and can still customize locally.

## Current state baseline

- Pure client-side React 19 / TypeScript SPA, deployed to Vercel.
- No auth, no backend, no `.env` files.
- React Query already wired up via `QueryClientProvider` in [src/main.tsx](../src/main.tsx).
- Existing client-side persistence pattern: `localStorage` with namespaced keys, used today for theme (`f1-theme`) and selected season (`f1-season`) in [ThemeContext.tsx](../src/context/ThemeContext.tsx) and [SeasonContext.tsx](../src/context/SeasonContext.tsx). The dashboard-layout flow can mirror this pattern for the anonymous tier.
- Current Dashboard cards on the home page ([src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx)): 4 stat cards (Championship Leader, Leading Constructor, Rounds Completed, Next Race) + 4 main cards (Driver Standings, Constructor Standings, Title Fight, Race Calendar).

This is greenfield from a server/auth standpoint. No migration of existing user data exists to worry about.

---

## Auth provider

**Recommendation: Supabase Auth.**

| | Supabase Auth | Clerk | Auth0 |
|---|---|---|---|
| Vendor footprint | Already in use; no new account/bill | New vendor | New vendor |
| Free tier MAU | 50K | 10K | 25K |
| DB integration | RLS with `auth.uid()` is native — zero glue | Webhook-based user-row sync needed | User-row sync via webhook/JIT |
| Pre-built UI | `@supabase/auth-ui-react` exists; less polished than Clerk | Best-in-class | Decent |
| Lock-in cost | Auth + DB combined (highest if migrating away) | Low (auth only) | Low (auth only) |

**Why Supabase wins for this project:**
- You already pay (or don't pay) Supabase. Adding auth is incremental, not a new vendor relationship.
- RLS + `auth.uid()` makes per-user data isolation a one-line policy; with Clerk or Auth0 you'd be writing webhook handlers to keep a `users` shadow table in sync, which is real ongoing work.
- For a personal F1 dashboard, Clerk's UX edge isn't worth the second account and second bill.

**When to revisit:** If you ever need enterprise SSO, MFA enforcement, or the auth UX itself becomes a friction point in user research, reconsider Clerk. Auth0 is overkill at this scale.

**Tactical note:** start with email + password (and email magic links as a near-free addition). Add Google OAuth in Phase 1 if you want a less-friction first signup; otherwise defer.

---

## Data model

### `users`

**Use Supabase's managed `auth.users` table directly.** No custom table needed for MVP — email, ID, and metadata are all there.

If we later need profile fields (display name, avatar URL, theme preference stored server-side), add a `profiles` table keyed by `user_id`:

```sql
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Out of scope for Phase 1.

### `dashboards`

```sql
create table dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Dashboard',
  is_default boolean not null default true,
  layout jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dashboards_user_id_idx on dashboards (user_id);

alter table dashboards enable row level security;

create policy "users manage their own dashboards"
  on dashboards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

The `layout` JSONB stores the ordered card list. For MVP, one row per user (`is_default=true`); the column structure already supports multi-dashboard later (just relax the unique-per-user assumption and add a "Switch dashboard" UI).

### `cards`

**MVP: don't create this table yet.** The `dashboards.layout` JSONB column is sufficient. Each entry has shape:

```ts
type LayoutEntry = {
  id: string         // stable client-generated UUID, used as React key and for D&D
  type: CardType     // 'driver_standings' | 'constructor_standings' | 'title_fight' | 'race_calendar' | ...
  config: object     // card-specific config object (empty {} until Phase 3)
}
```

Storing as JSONB keeps Phase 1 atomic and simple: load the dashboard row, render from layout, save the whole layout on change.

**Promote `cards` to a real table in Phase 3** when per-card config gets complex enough that you want to query/index/share individual cards. Migration at that point is straightforward: read each `dashboards.layout` array, fan out into `cards` rows, drop the JSONB column.

```sql
-- Phase 3 only:
create table cards (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references dashboards(id) on delete cascade,
  card_type text not null,
  position integer not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_dashboard_id_idx on cards (dashboard_id, position);
```

---

## State management

**Layout state lives in React Query.** Once auth is in play, the dashboard is a remote resource — fetched, cached, and mutated like any other API resource.

### Hook shape

```ts
useDashboard()        // returns { layout, isLoading, isError, isAuthenticated }
useUpdateDashboard()  // returns mutate({ layout }) with optimistic update
```

`useDashboard` reads `auth.user`. If signed in, it fetches `dashboards` via the Supabase client (RLS scopes to current user). If anonymous, it reads/writes `localStorage` under `f1-dashboard-layout` to mirror the existing theme/season persistence pattern.

### Sync strategy: optimistic + debounced auto-save

- Each layout edit (toggle a card, reorder, remove) calls `useUpdateDashboard` with the new full layout.
- `onMutate` updates the React Query cache *immediately* — UI is instant.
- The actual Supabase write is **debounced ~500ms** after the last edit. Fast-clicking through a reorder produces one DB write at the end, not one per drag.
- `onError` rolls back the cache to the previous layout and shows a toast.
- A small "Saved 2s ago" / "Saving…" indicator near the layout-edit affordance gives feedback without a Save button.

### Why not explicit Save?
Explicit Save buttons add friction for what is fundamentally a low-stakes preference. Auto-save with a clear indicator matches Notion / Figma / iCloud conventions. Open question #7 below leaves room to revisit.

### Cache invalidation
- Sign-in: invalidate `['dashboard']` so the React Query cache is rebuilt from server data.
- Sign-out: clear the `['dashboard']` cache; localStorage layout (if it exists) is then read on next mount.

---

## Anonymous → logged-in flow

### Anonymous user (no session)
- Sees the existing 4-card default layout.
- Can edit (Phase 2+: add/remove/reorder); changes persist in `localStorage` under `f1-dashboard-layout`.
- Persistent banner or unobtrusive CTA: *"Sign in to sync your dashboard across devices."*

### On sign-up (first ever sign-in for this account)
1. After successful auth, check `localStorage.f1-dashboard-layout`.
2. If present and non-default: insert a `dashboards` row with that layout, then clear the localStorage key.
3. If absent or matches the default: insert a `dashboards` row with the default layout.
4. Either way, transition cleanly into the signed-in experience.

### On sign-in (account already has a saved dashboard)
- If `localStorage.f1-dashboard-layout` exists *and* differs from the user's saved dashboard: show a one-time modal:
  - "We found a layout you set up before signing in. Use this, or keep your saved dashboard?" → two buttons.
- If localStorage is empty or matches saved: silently use the saved dashboard, clear localStorage.

### On sign-out
- Clear React Query cache for `['dashboard']`.
- Don't write back to localStorage automatically (would surprise the user). Next session as anonymous starts fresh from default.

---

## Card system

**MVP: visibility toggle on a fixed card registry. No custom params.**

Why: the user's primary need is "show me what I care about." That's covered by *which cards appear* and *in what order*. Custom params (e.g., "Driver Standings showing top 8 instead of top 5") is a Phase 3 luxury.

### Card registry

```ts
// src/components/dashboard/cardRegistry.ts (new file in Phase 2)
type CardType = 'driver_standings' | 'constructor_standings' | 'title_fight' | 'race_calendar'

type CardEntry = {
  type: CardType
  label: string
  description: string
  component: React.ComponentType<CardProps>  // takes layout-item config + global context
  defaultConfig: object
}

const CARD_REGISTRY: Record<CardType, CardEntry> = {
  driver_standings:      { ... },
  constructor_standings: { ... },
  title_fight:           { ... },
  race_calendar:         { ... },
}
```

Adding a new card type later = add to registry + write the component. No DB migration.

### User actions (Phase 2)
- **Add card:** "+ Add" button opens a modal listing card types not currently in the layout. Click → append to layout.
- **Remove card:** small "×" on hover at the top-right of each card.
- **Reorder:** drag-and-drop. Use `@dnd-kit/core` (small, accessible, modern; supersedes react-dnd for new code).

### Phase 3 stretch: per-card config
- Each card type defines a settings schema; UI is a gear icon → modal with form.
- Examples: `driver_standings.topN` (default 5, range 3–10); `title_fight.driverIds` (override the auto-top-3); `race_calendar.upcomingOnly` (boolean).
- Promotes the JSONB layout to a `cards` table for queryability, and gives each card a stable id you can reference (e.g., for sharing).

---

## Phased rollout

### Phase 1 — Auth + persistence (≈ 30–40 hours)

- Supabase Auth wiring: client init, `AuthProvider` context, `useAuth()` hook.
- Sign-in / sign-up routes (`/login`, `/signup`) with email + password. (Optional: Google OAuth — small additional work if you decide on it now.)
- `dashboards` table migration with RLS policy.
- `useDashboard` + `useUpdateDashboard` hooks (server and localStorage backends).
- Refactor [Dashboard.tsx](../src/pages/Dashboard.tsx) to render *from* the layout array instead of a hard-coded JSX tree. Layout is still the existing 4 cards; users can't edit it yet.
- Migration logic: anonymous-localStorage → first-login dashboards row.
- Sign-out + cache invalidation.
- "Saved" / "Saving" indicator scaffolded (will start showing meaningfully in Phase 2 once edits are possible).
- **Out of scope:** add/remove/reorder UI.

**Effort: 30–40 hours.** Bulk is auth UI plus the Dashboard refactor. The DB layer is small.

### Phase 2 — Add / remove / reorder cards (≈ 15–25 hours)

- Card registry as a real module.
- "Add card" modal.
- Per-card "×" remove button.
- Drag-and-drop reordering with `@dnd-kit/core` (new dep).
- Optimistic update + debounced save through `useUpdateDashboard`.
- "Saved 2s ago" indicator becomes meaningful.
- Edge-case empty state: layout = `[]` → show a centered "Your dashboard is empty — add a card to get started" CTA.

**Effort: 15–25 hours.** Mostly UI. DB shape unchanged (the `layout` JSONB just gets richer arrays).

### Phase 3 — Per-card configuration (≈ 25–35 hours, most variable)

- Per-card-type settings schemas (TypeScript types + Zod or similar for runtime validation).
- Settings panel (gear icon) per card → form rendered from schema.
- Promote layout JSONB to a real `cards` table; data migration script.
- New card types as time allows: next-race countdown, weather widget, lap chart, etc.

**Effort: 25–35 hours.** Driven by how many card types accept config and how rich each schema is. This phase is the "as needed" tail.

**Total: ~70–100 hours** spread across maybe 4–6 weeks of solo evening work, depending on how much of Phase 3 lands.

---

## Open questions (need your input before any code)

1. **Auth methods for Phase 1.** Email + password only, or email + Google OAuth from day one? (Google adds maybe ~3 hours of setup but materially improves first-time signup conversion.)

2. **Email verification.** Block sign-in until the user clicks the verification email link, or allow immediate sign-in with a "verify your email" banner? Supabase defaults to required-verified.

3. **Multi-dashboard per user.** Stick with one default dashboard per user (simpler), or design Phase 1 with a "saved views" UI (multiple named layouts) from the start? I lean single for MVP — the table schema already accommodates either.

4. **Account / settings page.** Need an explicit `/account` page in Phase 1 (change password, delete account, sign out), or is "Sign out" in a topbar menu enough for now?

5. **Drag-and-drop dependency.** Is adding `@dnd-kit/core` (≈30 KB gzipped) acceptable in Phase 2, or would you rather defer reordering to Phase 3 to avoid the dep? Manual "Move up / Move down" buttons are an alternative for Phase 2 that keeps the dep count flat.

6. **Default layout.** Is the current 4-card grid (Driver Standings / Constructor Standings / Title Fight / Race Calendar) the right default for anonymous + first-time users, or should we curate a different starter set?

7. **Save UX.** Auto-save with "Saved 2s ago" indicator (recommended, lower friction), or explicit Save button (more agency, more friction)? Influences a small amount of UI work either way.

8. **Public/sharable dashboards.** Yes / no / later? If "yes" enters scope, the `dashboards` table needs an `is_public` boolean and a separate read-only RLS policy for unauthenticated reads — small but worth deciding now to avoid a migration later.

9. **Anticipated scale.** Anything I should know about expected user count? Supabase free tier is 50K MAU and 500 MB DB, which is probably 100× more than we need, but if there's a reason to expect viral traffic (a tweet, a share button, etc.) we should plan for limits.

10. **Testing.** This codebase has no test framework today. Phase 1 is the natural moment to add one (vitest + React Testing Library, plus Supabase test client) — *or* we continue with no tests and rely on lint+build+manual verification. The latter scales poorly past Phase 1, so flagging now.

---

## What to expect after this plan is approved

Once the open questions are resolved, the next artifact will be a per-phase implementation plan with task-level breakdowns under `docs/superpowers/plans/` (matching the workflow used for the Title Fight and Career Arc fixes). Phase 1 alone is large enough that it warrants its own plan and likely several focused PRs.
