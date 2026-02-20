import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { Trophy, TrendingDown } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import {
  useDriverStandings,
  useDriverStandingsOverTime,
} from '@/hooks/useSeasonStandings'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

type DisplayCount = 3 | 5 | 10 | 'all'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900/95 px-3 py-2 text-xs shadow-xl max-h-64 overflow-y-auto">
      <p className="text-gray-400 mb-2 font-medium">Round {label}</p>
      {sorted.map((p: { color: string; name: string; value: number }) => (
        <p key={p.name} className="flex items-center gap-2 py-0.5" style={{ color: p.color }}>
          <span className="font-bold w-16">{p.name}</span>
          <span className="text-gray-300">{p.value} pts</span>
        </p>
      ))}
    </div>
  )
}

export function DriversChampionship() {
  const { season } = useSeason()
  const [displayCount, setDisplayCount] = useState<DisplayCount>(10)
  const standingsQuery = useDriverStandings(season)
  const overTimeQuery = useDriverStandingsOverTime(season)

  const standings = standingsQuery.data ?? []
  const limit =
    displayCount === 'all' ? standings.length : (displayCount as number)
  const displayedDrivers = standings.slice(0, limit)

  // Build chart data: [{round, VER: 25, NOR: 18, ...}]
  const chartData = overTimeQuery.data.map(({ round, standings: s }) => {
    const point: Record<string, number | string> = { round: `R${round}` }
    s.slice(0, limit).forEach((entry) => {
      point[entry.driver.code] = entry.points
    })
    return point
  })

  // Gap-to-leader chart data
  const gapData = overTimeQuery.data.map(({ round, standings: s }) => {
    const leaderPts = s[0]?.points ?? 0
    const point: Record<string, number | string> = { round: `R${round}` }
    s.slice(1, limit).forEach((entry) => {
      point[entry.driver.code] = leaderPts - entry.points
    })
    return point
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Trophy className="h-7 w-7 text-[#e10600]" />
            {season} Drivers Championship
          </h1>
          <p className="text-gray-500 mt-1">Points standings and season trajectory</p>
        </div>
        <div className="flex gap-2">
          {(['3', '5', '10', 'all'] as string[]).map((v) => (
            <button
              key={v}
              onClick={() => setDisplayCount(v === 'all' ? 'all' : (Number(v) as DisplayCount))}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                String(displayCount) === v
                  ? 'bg-[#e10600] text-white'
                  : 'bg-white/[0.06] text-gray-400 hover:bg-white/10'
              }`}
            >
              Top {v === 'all' ? 'All' : v}
            </button>
          ))}
        </div>
      </div>

      {/* Standings Table */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Current Standings</h2>
        {standingsQuery.isLoading ? (
          <Skeleton variant="chart" height={400} />
        ) : standingsQuery.isError ? (
          <ErrorState onRetry={() => standingsQuery.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-white/[0.06]">
                  <th className="pb-3 text-left w-10">Pos</th>
                  <th className="pb-3 text-left">Driver</th>
                  <th className="pb-3 text-left">Team</th>
                  <th className="pb-3 text-right">Points</th>
                  <th className="pb-3 text-right">Wins</th>
                  <th className="pb-3 text-right">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {displayedDrivers.map((entry) => {
                  const gap = standings[0]
                    ? standings[0].points - entry.points
                    : 0
                  return (
                    <tr
                      key={entry.driver.driverId}
                      className="group hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3 pr-2">
                        <span className="text-sm font-bold text-gray-400">
                          {entry.position}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link
                          to={`/drivers/${entry.driver.driverId}`}
                          className="flex items-center gap-2 group-hover:text-[#e10600] transition-colors"
                        >
                          <span
                            className="h-7 w-0.5 rounded-full"
                            style={{ backgroundColor: entry.constructor.color }}
                          />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {entry.driver.firstName} {entry.driver.lastName}
                            </div>
                            <div className="text-xs text-gray-600">
                              #{entry.driver.number || '—'}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3">
                        <span
                          className="text-sm"
                          style={{ color: entry.constructor.color }}
                        >
                          {entry.constructor.name}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-white">
                        {entry.points}
                      </td>
                      <td className="py-3 text-right text-gray-400">
                        {entry.wins}
                      </td>
                      <td className="py-3 text-right text-gray-500 text-xs">
                        {gap > 0 ? `−${gap}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Points Evolution */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Points Progression</h2>
        <p className="text-xs text-gray-500 mb-4">Cumulative points after each round</p>
        {overTimeQuery.isLoading ? (
          <Skeleton variant="chart" height={320} />
        ) : overTimeQuery.isError ? (
          <ErrorState />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
            No round-by-round data available for {season}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
              <Tooltip content={<ChartTooltip />} />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-gray-400">{value}</span>
                )}
              />
              {displayedDrivers.map((entry) => (
                <Line
                  key={entry.driver.driverId}
                  type="monotone"
                  dataKey={entry.driver.code}
                  stroke={entry.constructor.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Gap to Leader */}
      <Card>
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-[#e10600]" />
          Gap to Championship Leader
        </h2>
        <p className="text-xs text-gray-500 mb-4">Points deficit to P1 after each round</p>
        {overTimeQuery.isLoading ? (
          <Skeleton variant="chart" height={280} />
        ) : gapData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
            No data available for {season}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={gapData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                label={{
                  value: 'Points behind leader',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#6b7280',
                  fontSize: 10,
                  dx: -10,
                }}
              />
              <Tooltip content={<ChartTooltip />} />
              {displayedDrivers.slice(1).map((entry) => (
                <Area
                  key={entry.driver.driverId}
                  type="monotone"
                  dataKey={entry.driver.code}
                  stroke={entry.constructor.color}
                  fill={`${entry.constructor.color}15`}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Points per Driver Bar */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Points Distribution</h2>
        {standingsQuery.isLoading ? (
          <Skeleton variant="chart" height={260} />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={displayedDrivers.map((d) => ({
                code: d.driver.code,
                points: d.points,
                color: d.constructor.color,
              }))}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
              <XAxis
                dataKey="code"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff0a' }}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ fill: '#ffffff08' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs">
                      <p style={{ color: payload[0]?.payload?.color }}>
                        {payload[0]?.payload?.code}: {payload[0]?.value} pts
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                {displayedDrivers.map((entry) => (
                  <Cell
                    key={entry.driver.driverId}
                    fill={entry.constructor.color}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
