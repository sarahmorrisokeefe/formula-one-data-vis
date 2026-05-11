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
