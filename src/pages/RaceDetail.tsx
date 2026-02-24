import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Timer, Zap } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { useSeason } from '@/context/SeasonContext'
import {
  useRaceResults,
  useQualifyingResults,
  useLapTimes,
  usePitStops,
  useSeasonSchedule,
} from '@/hooks/useRaceData'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { LapPositionChart } from '@/components/charts/LapPositionChart'
import { TireStrategyChart } from '@/components/charts/TireStrategyChart'

function lapTimeToSeconds(time: string): number | null {
  if (!time) return null
  const parts = time.split(':')
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1])
  }
  return parseFloat(time)
}

export function RaceDetail() {
  const { round } = useParams<{ round: string }>()
  const { season } = useSeason()
  const roundNum = Number(round ?? 1)

  const scheduleQuery = useSeasonSchedule(season)
  const resultsQuery = useRaceResults(season, roundNum)
  const qualifyingQuery = useQualifyingResults(season, roundNum)
  const lapTimesQuery = useLapTimes(season, roundNum)
  const pitStopsQuery = usePitStops(season, roundNum)

  const race = scheduleQuery.data?.find((r) => r.round === roundNum)
  const results = resultsQuery.data ?? []
  const qualifying = qualifyingQuery.data ?? []
  const lapTimes = lapTimesQuery.data ?? []
  const pitStops = pitStopsQuery.data ?? []

  // Qualifying delta to pole
  const poleTime = qualifying[0]?.q3 ?? qualifying[0]?.q1 ?? null
  const poleSeconds = poleTime ? lapTimeToSeconds(poleTime) : null

  const qualifyingDeltas = qualifying.map((q) => {
    const bestTime = q.q3 ?? q.q2 ?? q.q1
    const seconds = bestTime ? lapTimeToSeconds(bestTime) : null
    const delta =
      poleSeconds && seconds ? seconds - poleSeconds : null
    return {
      code: q.driver.code,
      delta: delta != null ? parseFloat(delta.toFixed(3)) : 0,
      color: q.constructor.color,
    }
  })

  // Fastest lap per driver
  const fastestLaps = results
    .filter((r) => r.fastestLap)
    .map((r) => ({
      code: r.driver.code,
      time: r.fastestLap!,
      seconds: lapTimeToSeconds(r.fastestLap!) ?? 0,
      color: r.constructor.color,
    }))
    .sort((a, b) => a.seconds - b.seconds)
    .slice(0, 15)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/races"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calendar
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          {race?.raceName ?? `Round ${roundNum}`}
        </h1>
        <p className="text-gray-500 mt-1">
          {race
            ? `${race.circuitName} · ${new Date(race.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
            : `${season} Season`}
        </p>
      </div>

      {/* Race Results Table */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Timer className="h-4 w-4 text-[#e10600]" />
          Race Classification
        </h2>
        {resultsQuery.isLoading ? (
          <Skeleton variant="chart" height={400} />
        ) : resultsQuery.isError ? (
          <ErrorState onRetry={() => resultsQuery.refetch()} />
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Results not yet available for this race
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-white/[0.06]">
                  <th className="pb-3 text-left w-10">Pos</th>
                  <th className="pb-3 text-left">Driver</th>
                  <th className="pb-3 text-left">Team</th>
                  <th className="pb-3 text-right">Grid</th>
                  <th className="pb-3 text-right">Laps</th>
                  <th className="pb-3 text-right">Time / Status</th>
                  <th className="pb-3 text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {results.map((r) => (
                  <tr
                    key={r.driver.driverId}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-2.5">
                      <span
                        className={`text-sm font-bold ${r.position <= 3 ? 'text-[#e10600]' : 'text-gray-400'}`}
                      >
                        {r.position}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <Link
                        to={`/drivers/${r.driver.driverId}`}
                        className="flex items-center gap-2 hover:text-[#e10600] transition-colors"
                      >
                        <span
                          className="h-6 w-0.5 rounded-full"
                          style={{ backgroundColor: r.constructor.color }}
                        />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {r.driver.firstName} {r.driver.lastName}
                        </span>
                        {r.fastestLapRank === 1 && (
                          <Zap className="h-3 w-3 text-purple-400" aria-label="Fastest lap" />
                        )}
                      </Link>
                    </td>
                    <td
                      className="py-2.5 text-sm"
                      style={{ color: r.constructor.color }}
                    >
                      {r.constructor.name}
                    </td>
                    <td className="py-2.5 text-right text-gray-400">
                      {r.grid === 0 ? 'PL' : r.grid}
                    </td>
                    <td className="py-2.5 text-right text-gray-400">{r.laps}</td>
                    <td className="py-2.5 text-right">
                      {r.time ? (
                        <span className="text-gray-300">{r.time}</span>
                      ) : (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            r.status === 'Finished'
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-bold text-white">
                      {r.points > 0 ? r.points : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Qualifying Delta */}
      {qualifying.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Qualifying Gap to Pole</h2>
          <p className="text-xs text-gray-500 mb-4">
            Best lap time delta to pole position
          </p>
          <ResponsiveContainer width="100%" height={Math.max(280, qualifying.length * 22)}>
            <BarChart
              data={qualifyingDeltas}
              layout="vertical"
              margin={{ top: 5, right: 60, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={{ stroke: '#ffffff0a' }}
                tickFormatter={(v) => `+${v.toFixed(2)}s`}
              />
              <YAxis
                type="category"
                dataKey="code"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                cursor={{ fill: '#ffffff08' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs">
                      <p style={{ color: payload[0]?.payload?.color }}>
                        {payload[0]?.payload?.code}: +{(payload[0]?.value as number).toFixed(3)}s
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                {qualifyingDeltas.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Lap Position Chart */}
      {lapTimes.length > 0 && results.length > 0 && (
        <Card padding="none">
          <div className="p-4 pb-2">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Race Position History</h2>
            <p className="text-xs text-gray-500">Lap-by-lap position changes</p>
          </div>
          <LapPositionChart lapTimes={lapTimes} results={results} />
        </Card>
      )}

      {/* Tire Strategy */}
      {(pitStops.length > 0 || lapTimes.length > 0) && results.length > 0 && (
        <Card padding="none">
          <div className="p-4 pb-2">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Pit Stop Strategy</h2>
            <p className="text-xs text-gray-500">
              Pit stops and stint lengths
            </p>
          </div>
          <TireStrategyChart
            pitStops={pitStops}
            results={results}
            totalLaps={Math.max(...results.map((r) => r.laps), 0)}
          />
        </Card>
      )}

      {/* Fastest Laps */}
      {fastestLaps.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            Fastest Laps
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(200, fastestLaps.length * 25)}>
            <BarChart
              data={fastestLaps}
              layout="vertical"
              margin={{ top: 5, right: 80, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={{ stroke: '#ffffff0a' }}
                domain={['auto', 'auto']}
                tickFormatter={(v) => `${Math.floor(v / 60)}:${(v % 60).toFixed(1).padStart(4, '0')}`}
              />
              <YAxis
                type="category"
                dataKey="code"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                cursor={{ fill: '#ffffff08' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs">
                      <p style={{ color: payload[0]?.payload?.color }}>
                        {payload[0]?.payload?.code}: {payload[0]?.payload?.time}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="seconds" radius={[0, 4, 4, 0]}>
                {fastestLaps.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
