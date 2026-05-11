# Dashboard Customization PR A: Extract Cards + Layout Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Dashboard's hard-coded 4-card layout so that each card lives in its own file and the dashboard renders from a layout array provided by a new `DashboardLayoutContext`. **Zero user-facing changes** — the rendered page is identical to today.

**Architecture:** Pull the 4 main `<Card>` blocks out of [src/pages/Dashboard.tsx](../../../src/pages/Dashboard.tsx) into individual components under `src/components/dashboard/cards/`, each calling its own React Query hooks internally (React Query's query deduplication means no extra network cost). Add a typed card registry that maps each `CardType` to its label, description, and `Component`. Add a `DashboardLayoutContext` whose state is an ordered array of `{ id, type }` entries persisted to `localStorage` under `f1-dashboard-layout` — mirrors the existing `ThemeContext` and `SeasonContext` patterns. Dashboard's Main Grid becomes `layout.map(entry => <CARD_REGISTRY[entry.type].Component key={entry.id} />)`. The 4 top-row stat cards (Championship Leader, Leading Constructor, Rounds Completed, Next Race) stay inline in Dashboard.tsx — they are explicitly NOT customizable.

**Tech Stack:** React 19, TypeScript, Vite, Recharts, React Query, Tailwind. No new dependencies in PR A.

**Verification model:** This project has no test framework installed (no vitest/jest in [package.json](../../../package.json); no `*.test.*` files). Verification per task is `npm run lint && npm run build` plus visual checks in the dev server. Pre-existing lint errors in 4 unrelated files (CircuitMap.tsx, SeasonContext.tsx, ThemeContext.tsx, PerformanceAnalysis.tsx) mean `npm run lint` already exits non-zero on `main`; success criterion is "zero NEW lint findings in files this PR touches" rather than overall lint exit code.

**Scope plan:** [docs/dashboard-customization-plan.md](../../dashboard-customization-plan.md) — read for context on the larger PR A + PR B split.

**Branch:** `feat/dashboard-customization-pr-a` (already created off latest main). All commits land on this branch; do not switch branches mid-implementation.

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `src/components/dashboard/cards/DriverStandingsCard.tsx` | Create | Renders driver standings card (top 5). Calls `useDriverStandings(season)` internally. |
| `src/components/dashboard/cards/ConstructorStandingsCard.tsx` | Create | Renders constructor standings card (top 5). Calls `useConstructorStandings(season)` internally. |
| `src/components/dashboard/cards/TitleFightCard.tsx` | Create | Renders the Title Fight trajectory chart. Calls `useDriverStandingsOverTime(season)` internally. Defines its own private `CustomTooltip`. |
| `src/components/dashboard/cards/RaceCalendarCard.tsx` | Create | Renders the race schedule card. Calls `useSeasonSchedule(season)` internally. |
| `src/components/dashboard/cardRegistry.ts` | Create | Exports `CardType` union, `LayoutEntry` type, `CARD_REGISTRY` object (type → metadata + Component), `DEFAULT_LAYOUT` constant. |
| `src/context/DashboardLayoutContext.tsx` | Create | Provides `useDashboardLayout()` returning `{ layout, setLayout }`. Hydrates from `localStorage` on mount with lazy useState initializer; writes through on every change. |
| `src/main.tsx` | Modify | Wraps `<App />` with `<DashboardLayoutProvider>`. |
| `src/pages/Dashboard.tsx` | Modify | Remove the 4 inline card JSX blocks, the `CustomTooltip` helper, the `titleFight` IIFE, `overTimeQuery`, and recharts/`TrendingUp` imports. Main Grid renders from `layout.map(...)`. Stat cards row unchanged. |

**Decomposition rationale:**
- Each card file < 100 lines, single responsibility (one card).
- Dashboard.tsx target after refactor: ~150 lines (down from 397), containing only the header + StatCard helper + 4 stat cards + the layout-driven Main Grid.
- Registry is a pure-data module; no React state.
- Context follows the exact pattern of [SeasonContext.tsx](../../../src/context/SeasonContext.tsx) and [ThemeContext.tsx](../../../src/context/ThemeContext.tsx).

**Why cards fetch their own data instead of receiving props:** Each card today is already self-contained (its loading/error/ready states depend only on its own query). Passing data via props would force Dashboard.tsx to keep coordinating all hooks even after the refactor, defeating the point. React Query's cache deduplication means that even if two card instances later call the same query, only one network request fires.

**Why tasks 1–7 don't break the build:** Each task either creates a new file (additive, no consumer yet) or wraps the existing app tree non-invasively (Task 7). The card JSX inside Dashboard.tsx remains in place throughout. Only Task 8 swaps the JSX for the layout render — by then every dependency exists.

---

## Task 1: Extract DriverStandingsCard

**Files:**
- Create: `src/components/dashboard/cards/DriverStandingsCard.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/components/dashboard/cards
```

- [ ] **Step 2: Write the component**

Create `src/components/dashboard/cards/DriverStandingsCard.tsx` with this exact content:

```tsx
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useDriverStandings } from '@/hooks/useSeasonStandings'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

export function DriverStandingsCard() {
  const { season } = useSeason()
  const driversQuery = useDriverStandings(season)
  const topDrivers = driversQuery.data?.slice(0, 5) ?? []

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#e10600]" />
          Driver Standings
        </h2>
        <Link
          to="/championship/drivers"
          className="text-xs text-gray-500 hover:text-[#e10600] transition-colors"
        >
          View all →
        </Link>
      </div>
      {driversQuery.isLoading ? (
        <TableSkeleton rows={5} />
      ) : driversQuery.isError ? (
        <ErrorState onRetry={() => driversQuery.refetch()} />
      ) : (
        <div className="space-y-2">
          {topDrivers.map((entry) => (
            <Link
              key={entry.driver.driverId}
              to={`/drivers/${entry.driver.driverId}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors group"
            >
              <span className="w-6 text-center text-sm font-bold text-gray-500">
                {entry.position}
              </span>
              <span
                className="h-8 w-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.constructor.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#e10600] transition-colors truncate">
                  {entry.driver.firstName} {entry.driver.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {entry.constructor.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {entry.points}
                </div>
                <div className="text-xs text-gray-600">pts</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exit 0. New file is unused by anything yet (it'll be wired up in Task 5); the only check is that the file itself type-checks.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/cards/DriverStandingsCard.tsx
git commit -m "refactor(dashboard): extract DriverStandingsCard into its own file"
```

---

## Task 2: Extract ConstructorStandingsCard

**Files:**
- Create: `src/components/dashboard/cards/ConstructorStandingsCard.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/dashboard/cards/ConstructorStandingsCard.tsx` with this exact content:

```tsx
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useConstructorStandings } from '@/hooks/useSeasonStandings'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConstructorBadge } from '@/components/ui/Badge'

export function ConstructorStandingsCard() {
  const { season } = useSeason()
  const constructorsQuery = useConstructorStandings(season)
  const topConstructors = constructorsQuery.data?.slice(0, 5) ?? []

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[#e10600]" />
          Constructor Standings
        </h2>
        <Link
          to="/championship/constructors"
          className="text-xs text-gray-500 hover:text-[#e10600] transition-colors"
        >
          View all →
        </Link>
      </div>
      {constructorsQuery.isLoading ? (
        <TableSkeleton rows={5} />
      ) : constructorsQuery.isError ? (
        <ErrorState onRetry={() => constructorsQuery.refetch()} />
      ) : (
        <div className="space-y-2">
          {topConstructors.map((entry) => (
            <div
              key={entry.constructor.constructorId}
              className="flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <span className="w-6 text-center text-sm font-bold text-gray-500">
                {entry.position}
              </span>
              <ConstructorBadge
                name={entry.constructor.name}
                color={entry.constructor.color}
              />
              <div className="flex-1" />
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {entry.points}
                <span className="ml-1 text-xs font-normal text-gray-600">pts</span>
              </div>
              <div className="text-xs text-gray-600 w-12 text-right">
                {entry.wins}W
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/cards/ConstructorStandingsCard.tsx
git commit -m "refactor(dashboard): extract ConstructorStandingsCard into its own file"
```

---

## Task 3: Extract TitleFightCard

**Files:**
- Create: `src/components/dashboard/cards/TitleFightCard.tsx`

This card pulls in the `CustomTooltip` helper that today is defined at [src/pages/Dashboard.tsx:53-66](../../../src/pages/Dashboard.tsx#L53-L66). Move `CustomTooltip` here as a file-private function (it has no other consumers).

- [ ] **Step 1: Write the component**

Create `src/components/dashboard/cards/TitleFightCard.tsx` with this exact content:

```tsx
import { TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useSeason } from '@/context/SeasonContext'
import { useDriverStandingsOverTime } from '@/hooks/useSeasonStandings'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value} pts
        </p>
      ))}
    </div>
  )
}

export function TitleFightCard() {
  const { season } = useSeason()
  const overTimeQuery = useDriverStandingsOverTime(season)

  // Identify the current top 3 from the latest completed round's standings.
  // This shifts mid-season as positions change — same semantics as the
  // existing `driversQuery.data?.slice(0, 3)` pattern.
  //
  // The over-time hook fires per-round queries for the entire season schedule,
  // including future rounds that the API answers with empty standings. We
  // treat "completed" as standings.length > 0 — those are the only rounds we
  // can plot, and only those should determine "top 3." Without this filter,
  // `latest` ends up being the season's final scheduled round (empty), so
  // topThree is [] and the chart renders blank.
  //
  // Build one row per completed round, with one numeric column per top-3
  // driver code. The round value is pre-formatted as "R{n}" so the reused
  // CustomTooltip renders it directly as the header.
  const titleFight = (() => {
    const rounds = overTimeQuery.data ?? []
    const completedRounds = rounds.filter((r) => r.standings.length > 0)
    if (completedRounds.length === 0) return { rows: [], topThree: [] }

    const latest = completedRounds[completedRounds.length - 1]
    const topThree = latest.standings.slice(0, 3)

    const rows = completedRounds.map(({ round, standings }) => {
      const row: Record<string, string | number> = { round: `R${round}` }
      for (const top of topThree) {
        const entry = standings.find(
          (s) => s.driver.driverId === top.driver.driverId
        )
        row[top.driver.code] = entry?.points ?? 0
      }
      return row
    })

    return { rows, topThree }
  })()

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-[#e10600]" />
        <h2 className="font-semibold text-gray-900 dark:text-white">Title Fight</h2>
      </div>
      {overTimeQuery.isLoading ? (
        <Skeleton variant="chart" height={200} />
      ) : overTimeQuery.isError ? (
        <ErrorState />
      ) : titleFight.rows.length < 2 ? (
        <div className="flex items-center justify-center h-[200px] text-xs text-gray-500 text-center px-4">
          Season just started — trajectories appear after round 2.
        </div>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={titleFight.rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
              <XAxis
                dataKey="round"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff0a' }}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              {titleFight.topThree.map((d) => (
                <Line
                  key={d.driver.driverId}
                  type="monotone"
                  dataKey={d.driver.code}
                  stroke={d.constructor.color}
                  strokeWidth={2}
                  dot={false}
                  name={d.driver.code}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center flex-wrap">
            {titleFight.topThree.map((d) => (
              <div key={d.driver.driverId} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-4 rounded-full"
                  style={{ backgroundColor: d.constructor.color }}
                />
                <span className="text-xs text-gray-400">{d.driver.code}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/cards/TitleFightCard.tsx
git commit -m "refactor(dashboard): extract TitleFightCard with private CustomTooltip"
```

---

## Task 4: Extract RaceCalendarCard

**Files:**
- Create: `src/components/dashboard/cards/RaceCalendarCard.tsx`

The current race calendar card uses `nextRace` (computed in Dashboard.tsx) to highlight the next race row. When extracted, the card needs to compute that itself from its own schedule fetch.

- [ ] **Step 1: Write the component**

Create `src/components/dashboard/cards/RaceCalendarCard.tsx` with this exact content:

```tsx
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useSeasonSchedule } from '@/hooks/useRaceData'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

export function RaceCalendarCard() {
  const { season } = useSeason()
  const scheduleQuery = useSeasonSchedule(season)
  const schedule = scheduleQuery.data ?? []
  const today = new Date()
  const nextRace = schedule.find((r) => new Date(r.date) >= today)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#e10600]" />
          Race Calendar
        </h2>
        <Link
          to="/races"
          className="text-xs text-gray-500 hover:text-[#e10600] transition-colors"
        >
          View all →
        </Link>
      </div>
      {scheduleQuery.isLoading ? (
        <TableSkeleton rows={5} />
      ) : scheduleQuery.isError ? (
        <ErrorState onRetry={() => scheduleQuery.refetch()} />
      ) : (
        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {schedule.map((race) => {
            const isPast = new Date(race.date) < today
            const isNext = race.circuitId === nextRace?.circuitId
            return (
              <Link
                key={race.round}
                to={`/races/${race.round}`}
                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.04] transition-colors ${isNext ? 'bg-[#e10600]/10' : ''}`}
              >
                <span className="w-6 text-xs text-gray-600 text-center">
                  R{race.round}
                </span>
                <span
                  className={`flex-1 truncate ${isPast ? 'text-gray-400' : isNext ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-300'}`}
                >
                  {race.raceName.replace(' Grand Prix', '')}
                </span>
                <span className="text-xs text-gray-600">
                  {new Date(race.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/cards/RaceCalendarCard.tsx
git commit -m "refactor(dashboard): extract RaceCalendarCard into its own file"
```

---

## Task 5: Add the card registry

**Files:**
- Create: `src/components/dashboard/cardRegistry.ts`

- [ ] **Step 1: Write the registry**

Create `src/components/dashboard/cardRegistry.ts` with this exact content:

```ts
import type { ComponentType } from 'react'
import { DriverStandingsCard } from './cards/DriverStandingsCard'
import { ConstructorStandingsCard } from './cards/ConstructorStandingsCard'
import { TitleFightCard } from './cards/TitleFightCard'
import { RaceCalendarCard } from './cards/RaceCalendarCard'

export type CardType =
  | 'driver_standings'
  | 'constructor_standings'
  | 'title_fight'
  | 'race_calendar'

export type LayoutEntry = {
  id: string
  type: CardType
}

type CardEntry = {
  type: CardType
  label: string
  description: string
  Component: ComponentType
}

export const CARD_REGISTRY: Record<CardType, CardEntry> = {
  driver_standings: {
    type: 'driver_standings',
    label: 'Driver Standings',
    description: 'Top 5 drivers in the championship with current points and team colors.',
    Component: DriverStandingsCard,
  },
  constructor_standings: {
    type: 'constructor_standings',
    label: 'Constructor Standings',
    description: 'Top 5 constructors in the championship with points and wins.',
    Component: ConstructorStandingsCard,
  },
  title_fight: {
    type: 'title_fight',
    label: 'Title Fight',
    description: "Cumulative-points trajectory for the championship's top 3 drivers across completed rounds.",
    Component: TitleFightCard,
  },
  race_calendar: {
    type: 'race_calendar',
    label: 'Race Calendar',
    description: 'Full season schedule with the next race highlighted.',
    Component: RaceCalendarCard,
  },
}

export const DEFAULT_LAYOUT: LayoutEntry[] = [
  { id: 'default-driver-standings', type: 'driver_standings' },
  { id: 'default-constructor-standings', type: 'constructor_standings' },
  { id: 'default-title-fight', type: 'title_fight' },
  { id: 'default-race-calendar', type: 'race_calendar' },
]
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/cardRegistry.ts
git commit -m "refactor(dashboard): add card registry with CardType, LayoutEntry, DEFAULT_LAYOUT"
```

---

## Task 6: Add DashboardLayoutContext

**Files:**
- Create: `src/context/DashboardLayoutContext.tsx`

Mirrors the pattern of [src/context/SeasonContext.tsx](../../../src/context/SeasonContext.tsx) — `createContext` + `useContext` + lazy useState initializer reading from localStorage. The validation in `readStoredLayout` defends against malformed stored data (older formats, hand-edited values) by falling back to default on any parse or shape error.

- [ ] **Step 1: Write the context**

Create `src/context/DashboardLayoutContext.tsx` with this exact content:

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
    return parsed as LayoutEntry[]
  } catch {
    return DEFAULT_LAYOUT
  }
}

export function DashboardLayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayoutState] = useState<LayoutEntry[]>(readStoredLayout)

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

  return (
    <DashboardLayoutContext.Provider value={{ layout, setLayout }}>
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
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/context/DashboardLayoutContext.tsx
git commit -m "refactor(dashboard): add DashboardLayoutContext with localStorage persistence"
```

---

## Task 7: Wrap the app with DashboardLayoutProvider

**Files:**
- Modify: `src/main.tsx`

The provider wraps `<App />` *inside* `QueryClientProvider` (so the layout context is available throughout the route tree, including any future card that uses React Query).

- [ ] **Step 1: Edit main.tsx**

Current content of `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
```

Add an import for `DashboardLayoutProvider` after the `App` import (line 5), and wrap `<App />` with it. New content:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { DashboardLayoutProvider } from '@/context/DashboardLayoutContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DashboardLayoutProvider>
        <App />
      </DashboardLayoutProvider>
    </QueryClientProvider>
  </StrictMode>
)
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0. The provider is now in the tree but nothing consumes the layout yet.

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "refactor(dashboard): wrap app with DashboardLayoutProvider"
```

---

## Task 8: Refactor Dashboard.tsx to render from layout

**Files:**
- Modify: `src/pages/Dashboard.tsx`

This is the cutover. After this task:
- Imports for `Link`, `TrendingUp`, all recharts modules, `TableSkeleton`, `ConstructorBadge` are removed (no longer used inside Dashboard.tsx).
- `CustomTooltip` helper deleted (now lives in TitleFightCard).
- `overTimeQuery` hook call deleted (only Title Fight used it).
- `titleFight` IIFE deleted.
- The 4 inline `<Card>` blocks inside the Main Grid are deleted.
- Main Grid becomes `layout.map(entry => <CardRegistry[entry.type].Component key={entry.id} />)`.

The header and the stat cards row remain unchanged.

- [ ] **Step 1: Replace the entire contents of src/pages/Dashboard.tsx**

Replace with this exact content:

```tsx
import { Trophy, Building2, Flag, Calendar } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'
import { CARD_REGISTRY } from '@/components/dashboard/cardRegistry'
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
  const { layout } = useDashboardLayout()
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

      {/* Main Grid: layout-driven */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {layout.map((entry) => {
          const Component = CARD_REGISTRY[entry.type].Component
          return <Component key={entry.id} />
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify lint reports no new findings in Dashboard.tsx**

Run: `npm run lint 2>&1 | grep "Dashboard\.tsx"`
Expected: empty output (pre-existing errors in other files don't count).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exit 0. tsc + vite build both succeed. The 4 cards are now rendered via the layout array.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "$(cat <<'EOF'
refactor(dashboard): render main grid from DashboardLayoutContext

Replace 4 hardcoded card JSX blocks with a layout-driven render that
iterates over useDashboardLayout().layout and looks up each card's
Component from CARD_REGISTRY. The 4 top-row stat cards remain inline —
they are not customizable. The CustomTooltip helper moved to
TitleFightCard (its only consumer); recharts imports, the overTimeQuery
hook call, and the titleFight IIFE are now in TitleFightCard.

Dashboard.tsx shrinks from 397 to ~145 lines. No user-facing behavior
change: with the default layout (first run, empty localStorage), the
page renders identically to before.
EOF
)"
```

---

## Task 9: Final verification

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: "nothing to commit, working tree clean".

- [ ] **Step 2: Run lint and build for one final pass**

Run: `npm run lint 2>&1 | grep -E "(Dashboard\.tsx|dashboard/cards|cardRegistry|DashboardLayoutContext)"`
Expected: empty output (zero lint findings in any file this PR touches).

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Manual visual verification in dev server**

Start the dev server: `npm run dev`. Open the URL.

**Default layout (first visit, empty localStorage):**
- [ ] Page header shows "{season} Season" + "Formula 1 Championship Overview"
- [ ] Stat cards row shows 4 cards: Championship Leader, Leading Constructor, Rounds Completed, Next Race — identical to today
- [ ] Main grid below shows 4 cards in the same order as before: Driver Standings, Constructor Standings, Title Fight, Race Calendar
- [ ] Each card's content matches the pre-refactor state (same standings, same tooltip on the chart, same race-calendar highlighting)
- [ ] No console errors

**localStorage persistence sanity check (PR A scope only — no edit UI yet, so editing requires devtools):**
- [ ] Open browser devtools → Application → Local Storage. Confirm no `f1-dashboard-layout` key exists yet (default layout isn't written until the user mutates it; PR A doesn't mutate).
- [ ] Manually set `localStorage["f1-dashboard-layout"] = '[{"id":"a","type":"race_calendar"},{"id":"b","type":"driver_standings"}]'` in the devtools console.
- [ ] Reload the page. The Main Grid should now show only 2 cards: Race Calendar first, then Driver Standings.
- [ ] Remove the localStorage key. Reload. Main Grid is back to the default 4 cards.
- [ ] Set the localStorage key to invalid JSON: `localStorage["f1-dashboard-layout"] = 'not valid'`. Reload. Main Grid falls back to default 4 cards. No console error.

- [ ] **Step 4: Stop the dev server** (Ctrl+C).

---

## Self-Review Checklist (for the implementer)

Before declaring PR A done:

- [ ] `grep CustomTooltip src/pages/Dashboard.tsx` returns empty (the helper fully moved out).
- [ ] `grep overTimeQuery src/pages/Dashboard.tsx` returns empty.
- [ ] `grep -E "Link|TrendingUp|LineChart|TableSkeleton|ConstructorBadge" src/pages/Dashboard.tsx` returns empty (all removed from Dashboard's imports).
- [ ] `wc -l src/pages/Dashboard.tsx` ≤ 150 lines.
- [ ] Each new card file under `src/components/dashboard/cards/` is < 200 lines.
- [ ] No new dependencies added to [package.json](../../../package.json) (PR A is dep-free).
- [ ] Every commit message is in lower-case `refactor(dashboard):` prefix style consistent with this branch.
