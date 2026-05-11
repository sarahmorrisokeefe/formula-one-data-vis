# Dashboard Customization PR B: Edit Mode + Add/Remove/Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Dashboard layout user-editable. A topbar icon (next to the theme toggle) toggles edit mode; in edit mode each card gets a "×" remove button and a drag handle, an "Add card" modal lets the user re-add removed cards, and a "Reset to default" link restores the default layout. Drag-and-drop uses `@dnd-kit/sortable` with a `TouchSensor` activation delay so mobile long-press engages drag without breaking scroll.

**Architecture:** Extend the existing `DashboardLayoutContext` from PR A with `isEditing`/`setEditing` state plus four mutator functions (`addCard`, `removeCard`, `reorderCards`, `resetToDefault`). Wrap each card render in a new `<SortableCard>` component that owns the `useSortable` hook, conditionally renders the edit chrome based on context, and stays out of the existing card files' way. Add a `<DashboardEditToolbar>` that appears only when `isEditing` is true. Add an `<AddCardModal>` listing not-currently-shown card types. The edit-toggle in Topbar only renders on the Dashboard route (`/`). Cards in the registry stay untouched.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind. Adds `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (one peer dep chain, ~30 KB gzipped total).

**Verification model:** No test framework in this project — verification per task is `npm run lint && npm run build` plus visual checks in the dev server. The single pre-existing lint finding on `src/context/DashboardLayoutContext.tsx:68` (`react-refresh/only-export-components`) is consistent with `SeasonContext.tsx` / `ThemeContext.tsx` and stays unchanged in PR B (we expand the file but don't restructure its export shape).

**Scope plan:** [docs/dashboard-customization-plan.md](../../dashboard-customization-plan.md) — already merged.

**Builds on:** PR A (merged) — provides card registry, DashboardLayoutContext, card components, layout-driven Main Grid.

**Branch:** `feat/dashboard-customization-pr-b` (already created off latest main). Stay on this branch throughout.

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` deps. |
| `src/context/DashboardLayoutContext.tsx` | Modify | Add `isEditing`, `setEditing`, `addCard`, `removeCard`, `reorderCards`, `resetToDefault` to the context value. Add a tiny UUID generator for new card IDs. Keep existing `layout`, `setLayout`, and `readStoredLayout` behavior. |
| `src/components/dashboard/SortableCard.tsx` | Create | Wraps a single card in `useSortable`. When `isEditing` is true, renders a top-right "×" remove button and a top-left drag handle visual; the whole card body is the drag handle (via `attributes`/`listeners`). Forwards children unchanged otherwise. |
| `src/components/dashboard/DashboardEditToolbar.tsx` | Create | Rendered above the Main Grid when `isEditing` is true. Contains the "+ Add card" button (opens `AddCardModal`), a "Reset to default" link (calls `resetToDefault` after a confirm), and a "Done" button (calls `setEditing(false)`). |
| `src/components/dashboard/AddCardModal.tsx` | Create | Modal listing card types from the registry not currently in `layout`. Click a row to add. Escape/backdrop/Cancel closes. |
| `src/components/layout/Topbar.tsx` | Modify | Add an "Edit dashboard" icon button next to the theme toggle. Visible only when route is `/`. Click toggles `setEditing`. Active state changes icon (e.g., `Settings2` → filled or color highlight). |
| `src/pages/Dashboard.tsx` | Modify | Wrap the layout-driven Main Grid in `<DndContext>` + `<SortableContext>`. Map each entry to `<SortableCard entry={entry}><CARD_REGISTRY[entry.type].Component /></SortableCard>`. Render `<DashboardEditToolbar />` above the grid when `isEditing`. Render the layout-empty CTA when `layout.length === 0` and `isEditing` is true. |

**Out of scope (deliberate):**
- Per-card configuration (settings panel, gear icon) — Phase 3 work, not this PR.
- Multiple dashboards / saved views.
- Editing the four top-row stat cards (they remain not customizable).
- Server sync / auth (different feature entirely; deferred in PR #6).

---

## Task 1: Install `@dnd-kit` dependencies

**Files:**
- Modify: `package.json` (npm will write the entry; do NOT hand-edit)
- Modify: `package-lock.json` (auto-updated)

- [ ] **Step 1: Install the three packages**

Run: `npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2`

If npm warns about peer deps or a version offset, install whatever current latest the registry resolves — pin to whatever lands in package.json. The exact version numbers above are guidance, not hard requirements; latest stable is the goal.

- [ ] **Step 2: Verify install + build**

Run: `npm run build`
Expected: exit 0. Vite picks up the new deps in `node_modules` and the empty-import build succeeds (nothing imports the deps yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities for dashboard reorder"
```

---

## Task 2: Expand DashboardLayoutContext with edit-mode + mutators

**Files:**
- Modify: `src/context/DashboardLayoutContext.tsx`

The context grows from `{ layout, setLayout }` to:
```ts
{
  layout, setLayout,             // existing
  isEditing, setEditing,         // new — edit-mode toggle
  addCard, removeCard,           // new — granular mutators
  reorderCards, resetToDefault,  // new — bulk operations
}
```

The mutators all wrap `setLayout` internally, so localStorage write-through and validation remain centralized.

- [ ] **Step 1: Replace the entire contents of `src/context/DashboardLayoutContext.tsx`**

Use Write to overwrite with this exact content:

```tsx
import { createContext, useContext, useState } from 'react'
import {
  CARD_REGISTRY,
  DEFAULT_LAYOUT,
  type CardType,
  type LayoutEntry,
} from '@/components/dashboard/cardRegistry'

const STORAGE_KEY = 'f1-dashboard-layout'

interface DashboardLayoutContextValue {
  layout: LayoutEntry[]
  setLayout: (next: LayoutEntry[]) => void
  isEditing: boolean
  setEditing: (next: boolean) => void
  addCard: (type: CardType) => void
  removeCard: (id: string) => void
  reorderCards: (fromIndex: number, toIndex: number) => void
  resetToDefault: () => void
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null)

function readStoredLayout(): LayoutEntry[] {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_LAYOUT
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT
    // Validate each entry has the right shape and a known type. If anything
    // is off, fall back to default rather than render with garbage data.
    const validTypes = Object.keys(CARD_REGISTRY) as CardType[]
    const isValid = parsed.every(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        typeof e.id === 'string' &&
        typeof e.type === 'string' &&
        validTypes.includes(e.type as CardType)
    )
    if (!isValid) return DEFAULT_LAYOUT
    // Duplicate ids would produce React "same key" warnings when the layout
    // is rendered. Fall back to default if storage was hand-edited badly.
    const ids = parsed.map((e) => e.id)
    if (new Set(ids).size !== ids.length) return DEFAULT_LAYOUT
    return parsed as LayoutEntry[]
  } catch {
    return DEFAULT_LAYOUT
  }
}

// Small ID generator. crypto.randomUUID is supported in all modern browsers
// (including Safari 15.4+); fall back to a timestamp-derived string for any
// rare environment where it's missing.
function newCardId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function DashboardLayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayoutState] = useState<LayoutEntry[]>(readStoredLayout)
  const [isEditing, setEditing] = useState(false)

  const setLayout = (next: LayoutEntry[]) => {
    setLayoutState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage may be unavailable (Safari private mode, quota errors).
      // Fail silently — the in-memory state still updates, so the UI works
      // for this session. The user just loses persistence.
    }
  }

  const addCard = (type: CardType) => {
    setLayout([...layout, { id: newCardId(), type }])
  }

  const removeCard = (id: string) => {
    setLayout(layout.filter((entry) => entry.id !== id))
  }

  const reorderCards = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= layout.length) return
    if (toIndex < 0 || toIndex >= layout.length) return
    const next = layout.slice()
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setLayout(next)
  }

  const resetToDefault = () => {
    setLayout(DEFAULT_LAYOUT)
  }

  return (
    <DashboardLayoutContext.Provider
      value={{
        layout,
        setLayout,
        isEditing,
        setEditing,
        addCard,
        removeCard,
        reorderCards,
        resetToDefault,
      }}
    >
      {children}
    </DashboardLayoutContext.Provider>
  )
}

export function useDashboardLayout(): DashboardLayoutContextValue {
  const ctx = useContext(DashboardLayoutContext)
  if (!ctx) {
    throw new Error('useDashboardLayout must be used within DashboardLayoutProvider')
  }
  return ctx
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0. The context expands but nothing yet consumes the new fields; the existing `useDashboardLayout` callsites in Dashboard.tsx just spread-ignore the additions.

- [ ] **Step 3: Commit**

```bash
git add src/context/DashboardLayoutContext.tsx
git commit -m "feat(dashboard): add edit mode + mutators to DashboardLayoutContext"
```

---

## Task 3: Add SortableCard wrapper component

**Files:**
- Create: `src/components/dashboard/SortableCard.tsx`

This is the heart of the dnd-kit integration. The wrapper:
- Uses `useSortable({ id: entry.id })` to register the card with `<SortableContext>` (set up in Task 7).
- Spreads `attributes` and `listeners` onto its root div so the entire card body is draggable when editing.
- When `isEditing` is true: renders a top-right "×" remove button positioned over the card, and applies a subtle visual cue (cursor + border highlight) to signal draggable state.
- When `isEditing` is false: renders children only, no overlay, no drag listeners.

- [ ] **Step 1: Write the component**

Create `src/components/dashboard/SortableCard.tsx` with this exact content:

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X } from 'lucide-react'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'
import type { LayoutEntry } from '@/components/dashboard/cardRegistry'

interface SortableCardProps {
  entry: LayoutEntry
  children: React.ReactNode
}

export function SortableCard({ entry, children }: SortableCardProps) {
  const { isEditing, removeCard } = useDashboardLayout()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id, disabled: !isEditing })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // When not editing, render the card normally with no overlay.
  if (!isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        {children}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      // The entire card body is the drag handle when editing. dnd-kit listeners
      // include onPointerDown / onKeyDown which initiate the drag gesture.
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing rounded-xl ring-2 ring-[#e10600]/30 ring-offset-2 ring-offset-transparent transition-shadow"
    >
      {children}
      <button
        type="button"
        onClick={(e) => {
          // Stop propagation so the click doesn't initiate a drag gesture.
          e.stopPropagation()
          e.preventDefault()
          removeCard(entry.id)
        }}
        // PointerDown also has to be stopped — dnd-kit's listeners initiate
        // drag on pointerdown, not click, so a naive click handler still
        // triggers a drag-grab before the button registers.
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Remove card"
        className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/90 text-white shadow-md hover:bg-red-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0. The wrapper imports from the new dnd-kit packages installed in Task 1 and from the expanded context from Task 2.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/SortableCard.tsx
git commit -m "feat(dashboard): add SortableCard wrapper for dnd-kit sortable integration"
```

---

## Task 4: Add the AddCardModal component

**Files:**
- Create: `src/components/dashboard/AddCardModal.tsx`

A simple modal that lists card types from `CARD_REGISTRY` not currently in `layout` (computed on the fly per the resolved decision). Clicking a row calls `addCard(type)` and closes the modal.

- [ ] **Step 1: Write the component**

Create `src/components/dashboard/AddCardModal.tsx` with this exact content:

```tsx
import { useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import {
  CARD_REGISTRY,
  type CardType,
} from '@/components/dashboard/cardRegistry'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'

interface AddCardModalProps {
  open: boolean
  onClose: () => void
}

export function AddCardModal({ open, onClose }: AddCardModalProps) {
  const { layout, addCard } = useDashboardLayout()

  // Available cards = registry types not currently in the layout.
  const usedTypes = new Set(layout.map((e) => e.type))
  const availableTypes = (Object.keys(CARD_REGISTRY) as CardType[]).filter(
    (t) => !usedTypes.has(t)
  )

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add card"
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/[0.08] dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-white/[0.06]">
          <h2 className="font-semibold text-gray-900 dark:text-white">Add a card</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/[0.08] dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          {availableTypes.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">
              All cards are already on your dashboard.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {availableTypes.map((type) => {
                const entry = CARD_REGISTRY[type]
                return (
                  <li key={type}>
                    <button
                      type="button"
                      onClick={() => {
                        addCard(type)
                        onClose()
                      }}
                      className="group flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#e10600]/10 text-[#e10600] group-hover:bg-[#e10600] group-hover:text-white transition-colors">
                        <Plus className="h-4 w-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                          {entry.label}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {entry.description}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/AddCardModal.tsx
git commit -m "feat(dashboard): add AddCardModal for choosing card types to insert"
```

---

## Task 5: Add the DashboardEditToolbar component

**Files:**
- Create: `src/components/dashboard/DashboardEditToolbar.tsx`

Rendered above the Main Grid when `isEditing` is true. Contains:
- "+ Add card" button (opens `AddCardModal`)
- "Reset to default" link (with `window.confirm` because it discards user customization)
- "Done" button (calls `setEditing(false)`)

The toolbar owns the `AddCardModal`'s open state locally — no need to lift it.

- [ ] **Step 1: Write the component**

Create `src/components/dashboard/DashboardEditToolbar.tsx` with this exact content:

```tsx
import { useState } from 'react'
import { Plus, RotateCcw, Check } from 'lucide-react'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'
import { AddCardModal } from './AddCardModal'

export function DashboardEditToolbar() {
  const { setEditing, resetToDefault } = useDashboardLayout()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e10600]/30 bg-[#e10600]/[0.04] px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#e10600] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#c40500] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add card
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset dashboard to default layout?')) {
                resetToDefault()
              }
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to default
          </button>
        </div>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-100 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          Done
        </button>
      </div>
      <AddCardModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardEditToolbar.tsx
git commit -m "feat(dashboard): add DashboardEditToolbar (add card, reset, done)"
```

---

## Task 6: Add the edit-mode toggle to Topbar

**Files:**
- Modify: `src/components/layout/Topbar.tsx`

The toggle is a small icon button next to the existing theme toggle. It's only rendered when the user is on the Dashboard route (`/`). Uses `useLocation` from `react-router-dom`.

- [ ] **Step 1: Replace the entire contents of `src/components/layout/Topbar.tsx`**

Use Write to overwrite with this exact content:

```tsx
import { Sun, Moon, Menu, Settings2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { useSeason } from '@/context/SeasonContext'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'
import { SEASON_YEARS } from '@/constants/f1'
import { Select } from '@/components/ui/Select'

interface TopbarProps {
  onMenuToggle: () => void
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { theme, toggleTheme } = useTheme()
  const { season, setSeason } = useSeason()
  const { isEditing, setEditing } = useDashboardLayout()
  const location = useLocation()

  // The edit toggle only appears on the Dashboard route. Editing card layout
  // from any other page doesn't make sense.
  const isOnDashboard = location.pathname === '/'

  const seasonOptions = SEASON_YEARS.map(y => ({ value: y, label: String(y) }))

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white dark:border-white/[0.06] dark:bg-black/20 dark:backdrop-blur-md px-4 sm:px-5">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* F1 wordmark — mobile only, shown when sidebar is hidden */}
        <div className="flex items-center gap-1.5 md:hidden">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#e10600]">
            <span className="text-[10px] font-black text-white tracking-tight">F1</span>
          </div>
        </div>

        <Select
          label="Season"
          value={season}
          onChange={v => setSeason(Number(v))}
          options={seasonOptions}
        />
      </div>

      <div className="flex items-center gap-2">
        {isOnDashboard && (
          <button
            onClick={() => setEditing(!isEditing)}
            className={`rounded-lg p-2 transition-colors ${
              isEditing
                ? 'bg-[#e10600]/10 text-[#e10600]'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100'
            }`}
            aria-label={isEditing ? 'Done editing dashboard' : 'Edit dashboard layout'}
            aria-pressed={isEditing}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0. The new icon shows on `/` and toggles `isEditing` in context. Nothing yet renders different on the Dashboard when `isEditing` flips — that's Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Topbar.tsx
git commit -m "feat(dashboard): add edit-mode toggle to Topbar (Dashboard route only)"
```

---

## Task 7: Wire Dashboard.tsx to render via DndContext + SortableCard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

The Main Grid switches from a plain `layout.map(...)` to:
- `<DndContext>` with three sensors (pointer for mouse, touch with 250 ms activation delay for mobile, keyboard for a11y).
- `<SortableContext>` listing the entry IDs in their current order.
- Each entry rendered through `<SortableCard>`.
- A `handleDragEnd` callback that resolves the source/destination indices and calls `reorderCards`.
- The `<DashboardEditToolbar>` rendered above the grid when `isEditing` is true.
- Layout-empty CTA when `layout.length === 0`.

- [ ] **Step 1: Replace the entire contents of `src/pages/Dashboard.tsx`**

Use Write to overwrite with this exact content:

```tsx
import { Trophy, Building2, Flag, Calendar } from 'lucide-react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useSeason } from '@/context/SeasonContext'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'
import { CARD_REGISTRY } from '@/components/dashboard/cardRegistry'
import { SortableCard } from '@/components/dashboard/SortableCard'
import { DashboardEditToolbar } from '@/components/dashboard/DashboardEditToolbar'
import { useDriverStandings, useConstructorStandings } from '@/hooks/useSeasonStandings'
import { useSeasonSchedule } from '@/hooks/useRaceData'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  color?: string
  icon?: typeof Trophy
}) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-gray-600" />}
      </div>
      <div
        className="text-2xl font-bold tracking-tight"
        style={{ color: color ?? 'inherit' }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </Card>
  )
}

export function Dashboard() {
  const { season } = useSeason()
  const { layout, isEditing, reorderCards } = useDashboardLayout()
  const driversQuery = useDriverStandings(season)
  const constructorsQuery = useConstructorStandings(season)
  const scheduleQuery = useSeasonSchedule(season)

  const topDrivers = driversQuery.data?.slice(0, 5) ?? []
  const topConstructors = constructorsQuery.data?.slice(0, 5) ?? []
  const schedule = scheduleQuery.data ?? []
  const today = new Date()

  const pastRaces = schedule.filter((r) => new Date(r.date) < today)
  const nextRace = schedule.find((r) => new Date(r.date) >= today)
  const lastRace = pastRaces[pastRaces.length - 1]

  const daysToNextRace = nextRace
    ? Math.ceil(
        (new Date(nextRace.date).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Small distance threshold prevents tap-to-click being interpreted as
      // drag-start on desktop.
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      // 250 ms long-press before drag engages on touch. Prevents the page
      // scroll gesture from accidentally initiating a card drag — same UX
      // pattern as iOS home-screen icon sorting.
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = layout.findIndex((e) => e.id === active.id)
    const to = layout.findIndex((e) => e.id === over.id)
    if (from === -1 || to === -1) return
    reorderCards(from, to)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          {season} Season
        </h1>
        <p className="text-gray-500 mt-1">
          Formula 1 Championship Overview
        </p>
      </div>

      {/* Stat Cards (not customizable) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {driversQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" />
          ))
        ) : driversQuery.isError ? (
          <div className="col-span-4">
            <ErrorState onRetry={() => driversQuery.refetch()} />
          </div>
        ) : (
          <>
            <StatCard
              label="Championship Leader"
              value={topDrivers[0]?.driver.code ?? '—'}
              sub={`${topDrivers[0]?.points ?? 0} points`}
              color={topDrivers[0]?.constructor.color}
              icon={Trophy}
            />
            <StatCard
              label="Leading Constructor"
              value={topConstructors[0]?.constructor.name ?? '—'}
              sub={`${topConstructors[0]?.points ?? 0} points`}
              color={topConstructors[0]?.constructor.color}
              icon={Building2}
            />
            <StatCard
              label="Rounds Completed"
              value={String(pastRaces.length)}
              sub={`of ${schedule.length} races`}
              icon={Flag}
            />
            <StatCard
              label={nextRace ? 'Next Race' : 'Season'}
              value={nextRace?.raceName.replace('Grand Prix', 'GP') ?? 'Complete'}
              sub={
                daysToNextRace != null
                  ? `In ${daysToNextRace} day${daysToNextRace === 1 ? '' : 's'}`
                  : lastRace?.raceName ?? ''
              }
              icon={Calendar}
            />
          </>
        )}
      </div>

      {/* Edit toolbar (rendered only when editing) */}
      {isEditing && <DashboardEditToolbar />}

      {/* Main Grid: layout-driven, with drag-and-drop when editing */}
      {layout.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Your dashboard is empty
          </p>
          <p className="text-xs text-gray-500">
            {isEditing
              ? 'Click "Add card" above to get started.'
              : 'Click the edit icon in the top bar to add cards.'}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={layout.map((e) => e.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {layout.map((entry) => {
                const Component = CARD_REGISTRY[entry.type].Component
                return (
                  <SortableCard key={entry.id} entry={entry}>
                    <Component />
                  </SortableCard>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no new lint findings**

Run: `npm run lint 2>&1 | grep "Dashboard\.tsx"`
Expected: empty.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): wire DndContext + SortableCard for edit-mode reorder

Dashboard's Main Grid now wraps in <DndContext> + <SortableContext> when
the layout is non-empty. Each card renders through <SortableCard>, which
becomes draggable + shows the remove button only when isEditing is true.
Drag-end calls reorderCards. The <DashboardEditToolbar> shows above the
grid in edit mode. An empty layout renders a centered CTA.

Three sensors are configured:
- PointerSensor with a 4px distance constraint (avoids tap-as-drag).
- TouchSensor with 250ms delay (long-press to drag on mobile; scroll
  gesture stays unaffected).
- KeyboardSensor with sortableKeyboardCoordinates (a11y).
EOF
)"
```

---

## Task 8: Final verification

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: "nothing to commit, working tree clean".

- [ ] **Step 2: Final lint + build**

Run: `npm run lint 2>&1 | grep -E "(Dashboard\.tsx|SortableCard|DashboardEditToolbar|AddCardModal|Topbar\.tsx|DashboardLayoutContext)"`
Expected: at most the single pre-existing finding on `DashboardLayoutContext.tsx:LINE — react-refresh/only-export-components` (consistent with SeasonContext.tsx and ThemeContext.tsx). No new findings on the other files.

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Manual visual verification in dev server**

Start the dev server: `npm run dev`. Open the URL.

**Default state (not editing):**
- [ ] Dashboard renders exactly as before (4 stat cards, 4 main cards in default order).
- [ ] No "×" buttons visible on cards. No drag handles visible.
- [ ] Topbar shows the gear (Settings2) icon next to the theme toggle.
- [ ] Navigate to any other page (e.g., `/drivers`): the gear icon disappears. Navigate back to `/`: it reappears.

**Entering edit mode:**
- [ ] Click the gear icon in topbar → icon switches to filled/red state, edit toolbar appears above the main grid with "Add card", "Reset to default", "Done" buttons.
- [ ] Each card in the main grid shows a red "×" button in its top-right.
- [ ] Cards have a subtle red outline / grab-cursor styling.

**Remove a card:**
- [ ] Click the "×" on Driver Standings → card disappears, grid re-flows. Other cards unchanged.
- [ ] Reopen browser devtools → Application → Local Storage → confirm `f1-dashboard-layout` exists with 3 entries, Driver Standings removed.

**Add a card:**
- [ ] Click "+ Add card" → modal opens listing Driver Standings (the one we removed).
- [ ] Click the row → modal closes, card appears at the end of the grid.
- [ ] Re-open "+ Add card" → modal shows "All cards are already on your dashboard."
- [ ] Close modal with Escape, backdrop click, or × — each works.

**Reorder a card (desktop):**
- [ ] Click and drag the Title Fight card on top of the Constructor Standings card.
- [ ] Cards swap positions; localStorage reflects the new order on next inspection.

**Reorder a card (mobile/touch — open devtools with touch simulation):**
- [ ] In edit mode, tap a card briefly → nothing happens (no immediate drag).
- [ ] Long-press a card (>250 ms) → drag preview engages.
- [ ] Reorder works the same way as desktop.

**Keyboard reorder:**
- [ ] Tab to a card → focus indicator visible.
- [ ] Space to lift → arrow keys move the card → Space to drop.

**Reset to default:**
- [ ] Click "Reset to default" → browser confirm dialog appears.
- [ ] Click OK → layout returns to the original 4 cards in original order.
- [ ] Click Cancel on the confirm → no change.

**Empty layout:**
- [ ] In edit mode, remove all 4 cards.
- [ ] Empty-state CTA appears: "Your dashboard is empty. Click 'Add card' above to get started."
- [ ] Click "Done" → CTA changes to "Click the edit icon in the top bar to add cards."
- [ ] Re-enter edit mode and add a card → CTA disappears, card appears.

**Done button:**
- [ ] In edit mode, click "Done" in toolbar → exits edit mode. Toolbar disappears. × buttons disappear. Layout persists.

**Persistence across reloads:**
- [ ] Customize the layout (e.g., remove one card, reorder two others).
- [ ] Reload the page. The custom layout persists.
- [ ] Open localStorage devtools, manually set `f1-dashboard-layout` to invalid JSON. Reload. Default layout restored, no console error.

- [ ] **Step 4: Stop the dev server** (Ctrl+C).

---

## Self-Review Checklist (for the implementer)

Before declaring PR B done:

- [ ] `grep "PointerSensor\|TouchSensor\|KeyboardSensor" src/pages/Dashboard.tsx` returns all three (sensors are configured).
- [ ] `grep "rectSortingStrategy" src/pages/Dashboard.tsx` returns a match.
- [ ] `grep "@dnd-kit" package.json` returns all three packages (core, sortable, utilities).
- [ ] `wc -l src/components/dashboard/SortableCard.tsx src/components/dashboard/AddCardModal.tsx src/components/dashboard/DashboardEditToolbar.tsx` — each under 100 lines.
- [ ] `npm run build` exits 0.
- [ ] No new files outside of `src/components/dashboard/`, `src/context/`, or planned modifications to `src/pages/Dashboard.tsx`, `src/components/layout/Topbar.tsx`, `package.json` / `package-lock.json`.
- [ ] None of the 4 card files in `src/components/dashboard/cards/` were modified (separation of concerns preserved).
