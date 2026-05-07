# Top 3 Points Card → Title Fight Trajectory Sparkline

**Date:** 2026-05-06
**Status:** Design approved, awaiting spec review
**Scope:** Replace one card on the Dashboard home page

## Background

The Dashboard ([src/pages/Dashboard.tsx:253-294](../../../src/pages/Dashboard.tsx#L253-L294)) renders a card titled "Top 3 Points" containing a Recharts `<LineChart>`. The current implementation is broken: all three `<Line>` components share `dataKey="pts"` and read from a 3-element array (one row per top-3 driver, key `pts` = season total). The result is three identical descending curves drawn in three constructor colors — visually meaningless and conceptually redundant with the Driver Standings card directly above it.

The original intent was a per-round trajectory sparkline showing each top-3 driver's championship progress across the season. We are now building that real version.

## Goal

Render a small (160px tall) sparkline on the Dashboard showing **each current top-3 driver's cumulative season points across completed rounds**. Title: **"Title Fight"**.

## Non-goals

- Constructor trajectories (separate concern; constructor card is fine as-is).
- A full standings-over-time chart (already exists on the Drivers Championship page via the same hook).
- Per-race-points or gap-to-leader views (rejected during design — wrong fit for a sparkline).
- Configurable `topN` or driver-picker UI (YAGNI for one home-page card).

## Approach

**Inline replacement** of the broken card's JSX in [Dashboard.tsx](../../../src/pages/Dashboard.tsx). No new component file — matches the existing inline-per-card pattern in that file. Reuses an existing hook; adds zero dependencies.

## Data

Reuse the existing `useDriverStandingsOverTime(season)` hook from [src/hooks/useSeasonStandings.ts:80-112](../../../src/hooks/useSeasonStandings.ts#L80-L112). It returns `{ data: { round: number; standings: DriverStandingEntry[] }[]; isLoading; isError }` — one entry per completed round, with each entry's `standings[i].points` being the driver's cumulative season total *as of that round* (this is exactly what the Ergast/jolpica `/{season}/{round}/driverStandings` endpoint returns).

The hook is already used by `DriversChampionship.tsx` and `HeadToHead.tsx`, so on a typical session the per-round queries will be warm in the React Query cache by the time a user lands on the dashboard. On a cold load, it fires N parallel requests (one per round) — acceptable, matches existing behavior on those other pages.

Identifying "top 3":
- Take the latest round's `standings` from the over-time data and slice the first 3.
- This means "top 3 in the *current* championship," which can shift mid-season as positions change. That is intentional and matches the existing card's `driversQuery.data?.slice(0, 3)` semantics.

Chart data shape (built in `useMemo` to avoid recomputing on every render):

```ts
// One row per completed round; one numeric column per top-3 driver code.
// `round` is a pre-formatted string ("R1", "R2", ...) so the reused
// CustomTooltip can render it directly as its header.
type Row = { round: string } & Record<string /* driver code */, number>

// Example for top 3 = VER, NOR, LEC after R5:
// [
//   { round: "R1", VER: 25, NOR: 18, LEC: 15 },
//   { round: "R2", VER: 43, NOR: 36, LEC: 27 },
//   ...
// ]
```

For each round entry, look up each top-3 driver by `driverId` in that round's standings and read `points`. If a top-3 driver was absent from an early round (e.g., joined mid-season), use `0` for that round — Recharts handles missing-as-zero cleanly for cumulative lines.

## Rendering

Match the existing card's structure (`<Card>` wrapper, `<TrendingUp>` icon, h2 title) at [Dashboard.tsx:253-258](../../../src/pages/Dashboard.tsx#L253-L258). Replace the chart and legend.

```tsx
<Card>
  <div className="flex items-center gap-2 mb-4">
    <TrendingUp className="h-4 w-4 text-[#e10600]" />
    <h2 className="font-semibold text-gray-900 dark:text-white">Title Fight</h2>
  </div>
  {/* loading | error | empty | chart — see states below */}
</Card>
```

Chart:
- `<ResponsiveContainer width="100%" height={160}>` (matches existing).
- `<LineChart data={chartData}>` with `<XAxis dataKey="round" hide />` and `<YAxis hide />`.
- One `<Line>` per top-3 driver with **distinct `dataKey={driver.code}`** (this is the fix — the current code shares `dataKey="pts"`), `stroke={driver.constructor.color}`, `strokeWidth={2}`, `dot={false}`, `type="monotone"`, `name={driver.driver.code}`.
- Reuse the existing `CustomTooltip` from [Dashboard.tsx:52-65](../../../src/pages/Dashboard.tsx#L52-L65) without modification. It renders Recharts's `label` value directly as the header. To get a "R5" style header, pre-format the round in the chart data: `{ round: "R1", VER: 25, ... }`. The XAxis is hidden so the string-vs-number type is invisible visually; only the tooltip header reads it.
- Bottom legend: keep the existing pattern from [Dashboard.tsx:281-291](../../../src/pages/Dashboard.tsx#L281-L291) — `flex gap-4 mt-2 justify-center flex-wrap`, a small color dot + driver code per top-3 driver.

## States

- **Loading** (`overTimeQuery.isLoading`): `<Skeleton variant="chart" height={160} />` (existing pattern).
- **Error** (`overTimeQuery.isError`): `<ErrorState />` (added — current broken card has no error path; bundled fix).
- **Empty** (`chartData.length < 2`): centered message — *"Season just started — trajectories appear after round 2."* The card frame still renders so the grid layout doesn't shift.
- **Ready**: chart + legend.

## Files changed

- [src/pages/Dashboard.tsx](../../../src/pages/Dashboard.tsx): import `useDriverStandingsOverTime`; add a `useMemo` for chart data; replace the broken card body.

No new files. No dependency changes.

## Verification

After the change:
- `npm run lint && npm run build` must pass.
- Visual check in the dev server:
  - Default (current) season: chart renders with three distinct lines, each constructor color, climbing from R1 to latest completed round.
  - A historical season (use the SeasonContext picker): chart renders identically.
  - A pre-season state: cannot easily simulate without mocking — instead verify the empty-state branch by temporarily setting the empty-state condition to `true` in dev, confirming layout stability, then reverting before commit.

## Open questions

None outstanding. Title was chosen as "Title Fight" during design; if user wants to keep "Top 3 Points," only the h2 string changes.
