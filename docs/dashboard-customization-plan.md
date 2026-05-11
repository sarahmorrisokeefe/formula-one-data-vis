# Dashboard Customization (localStorage-only) — Feature Plan

**Status:** Scoping draft. Awaiting review before implementation.

**Date:** 2026-05-11

**Supersedes (for now):** the auth-based plan in [docs/dashboard-feature-plan.md](dashboard-feature-plan.md), which is preserved as "someday" reference in PR #6.

---

## Goal

Let users add, remove, and reorder cards on the Dashboard home page. Persist the layout in `localStorage`. **No auth, no backend.**

## What changed from the auth-based plan

PR #6's plan covered the same customization UX *plus* auth and cross-device sync. After review, auth was deemed overkill for a personal F1 dashboard with no per-user content beyond layout preferences. The customization UI carries virtually all the user-facing value; auth's only unique contribution is per-device-prefs → cross-device sync.

Effort estimate drops from ~70–100h to **~15–25h**. New vendors: zero. Architecture survives a future "add auth" decision — the layout-state shape ports directly to a Supabase-backed implementation if/when sync ever matters.

## Design decisions (already settled)

These were resolved during the discussion that produced this slim plan; included here so they're not re-litigated mid-implementation:

- **Persistence:** `localStorage` key `f1-dashboard-layout`. Same pattern as the existing `f1-theme` and `f1-season` keys.
- **Reading:** in a `DashboardLayoutContext` (mirrors `ThemeContext` and `SeasonContext`), with a `useDashboardLayout()` hook for consumers. Hydrate from `localStorage` on mount; default to the current 4-card layout if nothing stored.
- **Writing:** on every layout edit, write the full layout JSON back to `localStorage`. No debouncing needed — `localStorage.setItem` is synchronous and cheap.
- **Card registry:** a fixed map of available card types. Each entry has a `type` key, a human label, an optional description, and a React component. Adding a new card type later = add an entry + write the component.
- **Reordering UX:** drag-and-drop via `@dnd-kit/core` (the modern, accessible D&D library; ~30 KB gzipped). Considered "Move up / Move down" buttons as a lighter-weight alternative — rejected because drag-and-drop is the natural mental model for grid layouts and the dep is small.
- **No per-card config in scope.** Cards are toggle-visible-or-not + reorder-only. Things like "show top 8 drivers instead of top 5" are out of scope; revisit if it ever becomes a real ask.
- **Empty state:** if the user removes every card, show a centered "Your dashboard is empty — add a card to get started" CTA inside the dashboard grid.
- **Where edits happen:** an "Edit" mode toggle in the dashboard header. When off, the dashboard looks like it does today (no remove buttons, no drag handles). When on, each card gets a "×" remove button and a drag handle, and a "+ Add card" button appears. Avoids permanent visual clutter for users who set their layout once and never touch it again.

## Data shape

`localStorage["f1-dashboard-layout"]` stores a JSON-stringified array:

```ts
type LayoutEntry = {
  id: string         // stable UUID, used as React key and D&D handle
  type: CardType     // one of the registry keys
}

// Stored value:
// [
//   { "id": "abc-123", "type": "driver_standings" },
//   { "id": "def-456", "type": "constructor_standings" },
//   { "id": "ghi-789", "type": "title_fight" },
//   { "id": "jkl-012", "type": "race_calendar" }
// ]
```

No `config` field. If/when we add per-card config, the shape extends additively to `{ id, type, config }` — old layouts deserialize fine with a `config ?? {}` default.

## Card registry

```ts
// src/components/dashboard/cardRegistry.ts (new file)
export type CardType =
  | 'driver_standings'
  | 'constructor_standings'
  | 'title_fight'
  | 'race_calendar'

type CardEntry = {
  type: CardType
  label: string             // 'Driver Standings'
  description: string       // 'Top 5 drivers with current points and team colors.'
  Component: React.ComponentType  // renders the card
}

export const CARD_REGISTRY: Record<CardType, CardEntry> = { ... }

export const DEFAULT_LAYOUT: LayoutEntry[] = [
  { id: '<uuid>', type: 'driver_standings' },
  { id: '<uuid>', type: 'constructor_standings' },
  { id: '<uuid>', type: 'title_fight' },
  { id: '<uuid>', type: 'race_calendar' },
]
```

Each card type already exists as inline JSX in [src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx); the implementation refactor extracts each into its own component file.

## Files affected

- **New:**
  - `src/components/dashboard/cardRegistry.ts` — registry + default layout + types
  - `src/components/dashboard/cards/DriverStandingsCard.tsx` — extracted from Dashboard.tsx
  - `src/components/dashboard/cards/ConstructorStandingsCard.tsx` — extracted
  - `src/components/dashboard/cards/TitleFightCard.tsx` — extracted
  - `src/components/dashboard/cards/RaceCalendarCard.tsx` — extracted
  - `src/components/dashboard/AddCardModal.tsx` — modal listing available types not currently in layout
  - `src/components/dashboard/DashboardEditToolbar.tsx` — toggle for edit mode + "Add card" button + reset-to-default
  - `src/context/DashboardLayoutContext.tsx` — provider + `useDashboardLayout` hook
- **Modified:**
  - `src/pages/Dashboard.tsx` — render from layout array via the registry; wrap edit mode
  - `src/App.tsx` — wrap with `DashboardLayoutProvider`
  - `package.json` — add `@dnd-kit/core`
- **Out of scope (not touched):**
  - The 4 top-row stat cards (Championship Leader, Leading Constructor, Rounds Completed, Next Race). They're a single "header strip," not user-customizable. Could be revisited later if asked.

## Implementation phases

This is small enough that I'd execute it as **two PRs**, not three:

### PR A: Extract cards + render-from-registry (no UX changes)

- Pull each of the 4 existing card bodies out of Dashboard.tsx into its own component file.
- Add the registry module + `LayoutEntry` type + default layout constant.
- Add `DashboardLayoutContext` reading from `localStorage` with default-layout fallback.
- Refactor Dashboard.tsx to render `layout.map(entry => <CardRegistry[entry.type].Component />)`.
- **Result:** site looks and behaves identically to today. The render path is the only thing that changed.
- **Effort: ~6–10 hours.** Mostly mechanical extraction + one new context.

### PR B: Edit mode + add/remove/reorder

- `DashboardEditToolbar` component (edit-mode toggle + "+ Add card" button + reset link).
- Edit-mode chrome on each card (× remove button + drag handle).
- `AddCardModal` with the not-currently-shown card list.
- `@dnd-kit/core` integration for sortable cards.
- `useDashboardLayout` exposes mutator functions (`addCard`, `removeCard`, `reorderCards`, `resetToDefault`).
- Empty-state CTA when `layout.length === 0`.
- **Effort: ~9–15 hours.** UI-heavy work.

Splitting this way means PR A can ship and sit in production safely (no behavior change, easy to revert), while PR B can iterate on the editing UX without risk to the static-rendering path.

## Open questions (need your input before implementing)

1. **Edit-mode trigger.** Where does the toggle live? Three options I'd consider:
   - **Topbar icon** (small pencil/gear icon in the existing top navigation) — most discoverable, least clutter
   - **Dashboard header button** ("Edit dashboard" pill next to the season picker) — clearest in-context
   - **Long-press / right-click** — most minimal, least discoverable
2. **Reset to default.** Should the edit toolbar include a "Reset to default" link? I assumed yes — flagging in case you'd rather omit it.
3. **Hidden cards live where?** When a card is removed, it goes back into the "Available cards" pool (the Add Card modal). Alternatively we could just maintain the in-layout array and the registry; "available" is computed as `registry keys − layout types`. I'm planning the latter (no separate hidden-cards storage). Confirming that's fine.
4. **D&D dep.** OK to add `@dnd-kit/core` (≈30 KB gzipped)? Alternative is up/down buttons, which avoid the dep but feel dated.
5. **Mobile drag-and-drop.** `@dnd-kit` supports touch out of the box, but reordering by drag on a small screen can be fiddly. Acceptable, or do you want long-press-to-reveal up/down buttons specifically for mobile?

## Out of scope (deliberate, not oversights)

- Auth, sign-in, accounts.
- Cross-device sync, "saved views," multi-dashboard.
- Per-card configuration (top-N, filters, etc.).
- The 4 stat cards in the dashboard header strip.
- A test framework. Continue with `npm run lint && npm run build` + manual visual verification, matching the convention established in PR #4 and PR #5.

## What happens after this plan is approved

1. Answer the 5 open questions.
2. Move to a per-PR spec under `docs/superpowers/specs/` and implementation plan under `docs/superpowers/plans/` for PR A (the extraction). Then execute via subagent-driven development like prior items.
3. Repeat for PR B (the editing UX) once PR A is merged.
