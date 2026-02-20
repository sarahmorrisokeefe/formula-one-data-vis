import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Tooltip as RechartTooltip,
} from 'recharts'
import { Building2 } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import {
  useConstructorStandings,
  useConstructorStandingsOverTime,
} from '@/hooks/useSeasonStandings'
import { useAllSeasonResults } from '@/hooks/useRaceData'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900/95 px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {sorted.map((p: { color: string; name: string; value: number }) => (
        <p key={p.name} style={{ color: p.color }} className="py-0.5 flex gap-2">
          <span className="font-bold w-24 truncate">{p.name}</span>
          <span>{p.value} pts</span>
        </p>
      ))}
    </div>
  )
}

export function ConstructorsChampionship() {
  const { season } = useSeason()
  const standingsQuery = useConstructorStandings(season)
  const overTimeQuery = useConstructorStandingsOverTime(season)
  const allResultsQuery = useAllSeasonResults(season)

  const standings = standingsQuery.data ?? []

  // Points evolution chart data
  const chartData = overTimeQuery.data.map(({ round, standings: s }) => {
    const point: Record<string, number | string> = { round: `R${round}` }
    s.forEach((entry) => {
      point[entry.constructor.name] = entry.points
    })
    return point
  })

  // Build per-round driver contributions per constructor
  const contributionData: Record<string, number | string>[] = []
  if (allResultsQuery.data) {
    const roundMap = new Map<number, Record<string, Record<string, number>>>()
    for (const race of allResultsQuery.data) {
      const round = Number(race.round)
      if (!roundMap.has(round)) roundMap.set(round, {})
      const roundEntry = roundMap.get(round)!
      for (const result of race.Results ?? []) {
        const constructorId = result.Constructor.constructorId
        const driverCode = result.Driver.code ?? result.Driver.familyName.slice(0, 3).toUpperCase()
        const pts = Number(result.points)
        if (!roundEntry[constructorId]) roundEntry[constructorId] = {}
        roundEntry[constructorId][driverCode] =
          (roundEntry[constructorId][driverCode] ?? 0) + pts
      }
    }
    const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b)
    for (const round of rounds) {
      const entry: Record<string, number | string> = { round: `R${round}` }
      const roundEntry = roundMap.get(round)!
      for (const ctor of standings) {
        const cid = ctor.constructor.constructorId
        const drivers = roundEntry[cid] ?? {}
        let i = 0
        for (const [code, pts] of Object.entries(drivers)) {
          entry[`${cid}_${i === 0 ? 'a' : 'b'}_${code}`] = pts
          i++
        }
      }
      contributionData.push(entry)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Building2 className="h-7 w-7 text-[#e10600]" />
          {season} Constructors Championship
        </h1>
        <p className="text-gray-500 mt-1">
          Team standings and driver contribution breakdown
        </p>
      </div>

      {/* Standings Table */}
      <Card>
        <h2 className="font-semibold text-white mb-4">Constructor Standings</h2>
        {standingsQuery.isLoading ? (
          <Skeleton variant="chart" height={320} />
        ) : standingsQuery.isError ? (
          <ErrorState onRetry={() => standingsQuery.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-white/[0.06]">
                  <th className="pb-3 text-left w-10">Pos</th>
                  <th className="pb-3 text-left">Constructor</th>
                  <th className="pb-3 text-left">Nationality</th>
                  <th className="pb-3 text-right">Points</th>
                  <th className="pb-3 text-right">Wins</th>
                  <th className="pb-3 text-right">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {standings.map((entry) => {
                  const gap = standings[0]
                    ? standings[0].points - entry.points
                    : 0
                  return (
                    <tr
                      key={entry.constructor.constructorId}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3">
                        <span className="text-sm font-bold text-gray-400">
                          {entry.position}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-7 w-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: entry.constructor.color }}
                          />
                          <span
                            className="font-semibold"
                            style={{ color: entry.constructor.color }}
                          >
                            {entry.constructor.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-400 text-xs">
                        {entry.constructor.nationality}
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

      {/* Constructor Points Evolution */}
      <Card>
        <h2 className="font-semibold text-white mb-1">Points Progression</h2>
        <p className="text-xs text-gray-500 mb-4">
          Cumulative constructor points after each round
        </p>
        {overTimeQuery.isLoading ? (
          <Skeleton variant="chart" height={320} />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
            No data available for {season}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
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
              {standings.map((entry) => (
                <Line
                  key={entry.constructor.constructorId}
                  type="monotone"
                  dataKey={entry.constructor.name}
                  stroke={entry.constructor.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Points Bar */}
      <Card>
        <h2 className="font-semibold text-white mb-4">Total Points Comparison</h2>
        {standingsQuery.isLoading ? (
          <Skeleton variant="chart" height={220} />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={standings.map((e) => ({
                name: e.constructor.name,
                points: e.points,
                color: e.constructor.color,
              }))}
              margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={{ stroke: '#ffffff0a' }}
                angle={-20}
                textAnchor="end"
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <RechartTooltip
                cursor={{ fill: '#ffffff06' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs">
                      <p style={{ color: payload[0]?.payload?.color }}>
                        {payload[0]?.payload?.name}: {payload[0]?.value} pts
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                {standings.map((entry) => (
                  <Cell
                    key={entry.constructor.constructorId}
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
