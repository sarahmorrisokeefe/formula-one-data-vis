# Title Fight Trajectory Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken "Top 3 Points" sparkline card on the Dashboard with a working "Title Fight" cumulative-points trajectory chart for the current top-3 drivers across the season's completed rounds.

**Architecture:** Single-file change in [src/pages/Dashboard.tsx](../../../src/pages/Dashboard.tsx). Reuses the existing `useDriverStandingsOverTime(season)` hook from [src/hooks/useSeasonStandings.ts](../../../src/hooks/useSeasonStandings.ts) (already powering DriversChampionship and HeadToHead pages). Builds a per-round chart-data array keyed by driver code so each Recharts `<Line>` gets a distinct `dataKey` (the original bug was three lines sharing `dataKey="pts"`). Identifies "top 3" from the latest completed round's standings, so the card always reflects the current championship leaders.

**Tech Stack:** TypeScript, React 19, React Query, Recharts, Tailwind. No new dependencies.

**Verification model:** This project has no test framework installed (no vitest/jest in [package.json](../../../package.json); no `*.test.*` files in `src/`). Adding one is out of scope per the user's "no new dependencies" constraint. Verification per task is therefore `npm run lint && npm run build` (tsc + vite build) plus manual visual checks in the dev server (`npm run dev`).

**Spec:** [docs/superpowers/specs/2026-05-06-top-three-trajectory-card-design.md](../specs/2026-05-06-top-three-trajectory-card-design.md)

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| [src/pages/Dashboard.tsx](../../../src/pages/Dashboard.tsx) | Modify | Add `useDriverStandingsOverTime` import + query call; add a `useMemo` deriving `{ rows, topThree }` from per-round standings; replace the broken card body at lines 253-294 with new loading/error/empty/ready branches |

No new files. No new dependencies. The reused `useDriverStandingsOverTime` hook and `CustomTooltip` helper already exist in the codebase and are unchanged.

---

## Task 1: Replace Top 3 Points card with Title Fight trajectory sparkline

**Files:**
- Modify: [src/pages/Dashboard.tsx](../../../src/pages/Dashboard.tsx) — import line 12, hook calls around line 69-75, and card JSX at lines 253-294

- [ ] **Step 1: Add the `useDriverStandingsOverTime` import**

In [src/pages/Dashboard.tsx:12](../../../src/pages/Dashboard.tsx#L12), extend the existing named import from `@/hooks/useSeasonStandings`:

Change:
```tsx
import { useDriverStandings, useConstructorStandings } from '@/hooks/useSeasonStandings'
```

To:
```tsx
import { useDriverStandings, useConstructorStandings, useDriverStandingsOverTime } from '@/hooks/useSeasonStandings'
```

Also add `useMemo` to the React import. The current file does not import `useMemo`. Add at the top of [src/pages/Dashboard.tsx](../../../src/pages/Dashboard.tsx) (the file currently has no `react` import line — Vite/React 19's automatic JSX runtime makes the bare `React` import optional, but `useMemo` requires an explicit named import):

Add as a new top-level import (place above the `react-router-dom` import on line 1 to keep React-related imports first):
```tsx
import { useMemo } from 'react'
```

- [ ] **Step 2: Add the per-round standings query call**

In [src/pages/Dashboard.tsx:67-75](../../../src/pages/Dashboard.tsx#L67-L75), the `Dashboard` function currently has:

```tsx
export function Dashboard() {
  const { season } = useSeason()
  const driversQuery = useDriverStandings(season)
  const constructorsQuery = useConstructorStandings(season)
  const scheduleQuery = useSeasonSchedule(season)

  const topDrivers = driversQuery.data?.slice(0, 5) ?? []
  const topConstructors = constructorsQuery.data?.slice(0, 5) ?? []
  const schedule = scheduleQuery.data ?? []
  const today = new Date()
```

Add `overTimeQuery` immediately after `scheduleQuery`:

```tsx
export function Dashboard() {
  const { season } = useSeason()
  const driversQuery = useDriverStandings(season)
  const constructorsQuery = useConstructorStandings(season)
  const scheduleQuery = useSeasonSchedule(season)
  const overTimeQuery = useDriverStandingsOverTime(season)

  const topDrivers = driversQuery.data?.slice(0, 5) ?? []
  const topConstructors = constructorsQuery.data?.slice(0, 5) ?? []
  const schedule = scheduleQuery.data ?? []
  const today = new Date()
```

- [ ] **Step 3: Delete the now-dead `sparklineData` derivation**

In [src/pages/Dashboard.tsx:82-85](../../../src/pages/Dashboard.tsx#L82-L85), remove these four lines entirely (they feed only the broken card we're replacing):

```tsx
  const sparklineData = topDrivers.slice(0, 3).map((d) => ({
    name: d.driver.code,
    pts: d.points,
  }))
```

- [ ] **Step 4: Add the `titleFight` memo right where `sparklineData` was**

In the same location, add:

```tsx
  const titleFight = useMemo(() => {
    const rounds = overTimeQuery.data ?? []
    if (rounds.length === 0) return { rows: [], topThree: [] }

    // Identify the current top 3 from the latest completed round's standings.
    // This shifts mid-season as positions change — same semantics as the
    // existing `driversQuery.data?.slice(0, 3)` pattern.
    const latest = rounds[rounds.length - 1]
    const topThree = latest.standings.slice(0, 3)

    // Build one row per completed round, with one numeric column per top-3
    // driver code. The round value is pre-formatted as "R{n}" so the reused
    // CustomTooltip renders it directly as the header.
    const rows = rounds.map(({ round, standings }) => {
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
  }, [overTimeQuery.data])
```

- [ ] **Step 5: Replace the broken card JSX**

In [src/pages/Dashboard.tsx:253-294](../../../src/pages/Dashboard.tsx#L253-L294), the current card body is:

```tsx
        {/* Points Sparkline */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#e10600]" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Top 3 Points</h2>
          </div>
          {driversQuery.isLoading ? (
            <Skeleton variant="chart" height={160} />
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={sparklineData}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  {topDrivers.slice(0, 3).map((d) => (
                    <Line
                      key={d.driver.driverId}
                      type="monotone"
                      dataKey="pts"
                      stroke={d.constructor.color}
                      strokeWidth={2}
                      dot={false}
                      name={d.driver.code}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 justify-center flex-wrap">
                {topDrivers.slice(0, 3).map((d) => (
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
```

Replace it with:

```tsx
        {/* Title Fight: top-3 cumulative points trajectory */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#e10600]" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Title Fight</h2>
          </div>
          {overTimeQuery.isLoading ? (
            <Skeleton variant="chart" height={160} />
          ) : overTimeQuery.isError ? (
            <ErrorState onRetry={() => window.location.reload()} />
          ) : titleFight.rows.length < 2 ? (
            <div className="flex items-center justify-center h-[160px] text-xs text-gray-500 text-center px-4">
              Season just started — trajectories appear after round 2.
            </div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={titleFight.rows}>
                  <XAxis dataKey="round" hide />
                  <YAxis hide />
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
```

Notes on the changes:
- `dataKey="pts"` (shared, broken) → `dataKey={d.driver.code}` (distinct per line — the actual fix)
- `data={sparklineData}` (3-row total-points array) → `data={titleFight.rows}` (one row per completed round)
- `XAxis dataKey="name"` → `XAxis dataKey="round"` (still hidden; just changes what the tooltip header reads)
- Loading gate `driversQuery.isLoading` → `overTimeQuery.isLoading` (matches the new data source)
- Adds explicit error and empty branches that did not exist before
- `<ErrorState onRetry={() => window.location.reload()} />` — `useDriverStandingsOverTime` doesn't expose a `refetch` (it's an aggregator over `useQueries`), so a hard reload is the simplest correct retry. Existing usages of this hook in `DriversChampionship.tsx` and `HeadToHead.tsx` are also `refetch`-less.

**Note on `useMemo` referential stability:** `useDriverStandingsOverTime` returns a fresh `data` array reference every render (it's built via `filter().map().sort()`). The `useMemo` above will therefore recompute on each render — it does not actually cache across renders. We keep it for code clarity and as a defensive measure if the hook is ever optimized to return stable refs. No correctness impact; do not "fix" by removing it.

- [ ] **Step 6: Run lint to confirm no new errors**

Run: `npm run lint`
Expected: exits 0 with no errors. The codebase already lint-passes; this change adds a `useMemo` import and uses it once, plus modifies one card body. No `any` introductions.

If `eslint-plugin-react-hooks` reports a missing dependency on the `useMemo`, the actual deps array `[overTimeQuery.data]` is correct (the hook returns a fresh array reference each render, so depending on `overTimeQuery.data` is the standard pattern); the rule should accept it.

- [ ] **Step 7: Run build to confirm tsc + vite build pass**

Run: `npm run build`
Expected: exits 0. `tsc -b` confirms types check (the `Record<string, string | number>` row shape and the driver-code indexing are both well-typed). `vite build` produces a `dist/` bundle.

If tsc complains about `entry?.points ?? 0` returning `string | number` instead of `number`, the issue is that `DriverStandingEntry.points` is `number` (verified in [src/types/domain.ts](../../../src/types/domain.ts) — `points: number`), so `entry?.points` is `number | undefined` and the nullish coalesce makes it `number`. No fix needed.

- [ ] **Step 8: Visual verification in the dev server**

Start the dev server: `npm run dev`. Open the browser to the URL shown (typically `http://localhost:5173/`).

Verify three states:

**(a) Default current season (2026, in progress):**
- Card titled "Title Fight" appears in the same grid slot the broken card occupied.
- Three distinct lines render in three different constructor colors, climbing from R1 to the latest completed round.
- Hovering a line shows the tooltip: `R{n}` header, three rows like `VER: 100 pts` colored to match each line.
- Bottom legend shows three driver codes (e.g., `VER`, `NOR`, `LEC`) with matching color dots.

**(b) Historical season (e.g., 2023):**
- Use the season picker (top-bar SeasonContext switcher) to switch to 2023.
- Same chart structure renders with that season's top 3, climbing across all 22 rounds to the season-final totals.

**(c) Empty state:**
- Cannot easily simulate a 0–1 round season without mocking. Instead, temporarily change the empty-state condition in the JSX to `true`:
  ```tsx
  ) : true ? (   // TEMP: force empty-state branch
  ```
- Reload, confirm the centered message *"Season just started — trajectories appear after round 2."* renders inside the card frame at full 160px height without breaking the grid layout.
- **Revert the `true` back to `titleFight.rows.length < 2` before the next step.**

- [ ] **Step 9: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): replace broken Top 3 Points sparkline with Title Fight trajectory

The original card had three Recharts <Line>s sharing dataKey="pts" against a
3-row total-points array, drawing three identical descending curves. Replaced
with a real per-round cumulative-points trajectory using the existing
useDriverStandingsOverTime hook, with distinct dataKey per top-3 driver.
Adds error and empty-state branches that the original card lacked.

Spec: docs/superpowers/specs/2026-05-06-top-three-trajectory-card-design.md
EOF
)"
```

Run `git status` to confirm a clean working tree.

---

## Self-Review Checklist (for the implementer)

After completing Task 1, before declaring done:

- [ ] All five Recharts `<Line>` props (`key`, `type`, `dataKey`, `stroke`, `name`) are present and use the new per-driver values.
- [ ] No reference to the deleted `sparklineData` variable remains anywhere in the file (`grep sparklineData src/pages/Dashboard.tsx` returns nothing).
- [ ] No reference to `driversQuery.isLoading` inside the new card body (the loading gate moved to `overTimeQuery.isLoading`).
- [ ] The temporary `true ?` from Step 8(c) was reverted.
- [ ] `npm run lint && npm run build` both exit 0.
- [ ] The commit message references the spec path.
