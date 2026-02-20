import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from 'recharts'
import { GitCompare } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSeason } from '@/context/SeasonContext'
import { useDriverStandings, useDriverStandingsOverTime } from '@/hooks/useSeasonStandings'
import { getDriverSeasonResults, getDriverSeasonQualifying } from '@/api/jolpica'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'

export function HeadToHead() {
  const { season } = useSeason()
  const standingsQuery = useDriverStandings(season)
  const overTimeQuery = useDriverStandingsOverTime(season)

  const drivers = standingsQuery.data ?? []
  const [driver1Id, setDriver1Id] = useState('')
  const [driver2Id, setDriver2Id] = useState('')

  const driverOptions = drivers.map((d) => ({
    value: d.driver.driverId,
    label: `${d.driver.firstName} ${d.driver.lastName}`,
  }))

  const d1 = drivers.find((d) => d.driver.driverId === driver1Id)
  const d2 = drivers.find((d) => d.driver.driverId === driver2Id)

  const results1Query = useQuery({
    queryKey: ['seasonResults', season, driver1Id],
    queryFn: () => getDriverSeasonResults(season, driver1Id),
    enabled: !!driver1Id,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  })

  const results2Query = useQuery({
    queryKey: ['seasonResults', season, driver2Id],
    queryFn: () => getDriverSeasonResults(season, driver2Id),
    enabled: !!driver2Id,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  })

  const quali1Query = useQuery({
    queryKey: ['seasonQualifying', season, driver1Id],
    queryFn: () => getDriverSeasonQualifying(season, driver1Id),
    enabled: !!driver1Id,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  })

  const quali2Query = useQuery({
    queryKey: ['seasonQualifying', season, driver2Id],
    queryFn: () => getDriverSeasonQualifying(season, driver2Id),
    enabled: !!driver2Id,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  })

  const races1 = results1Query.data ?? []
  const races2 = results2Query.data ?? []

  function calcStats(races: typeof races1) {
    const results = races.map((r) => r.Results?.[0]).filter(Boolean)
    const finishes = results.filter((r) => r!.status === 'Finished' || r!.status.startsWith('+'))
    const positions = results.map((r) => Number(r!.position)).filter((p) => p > 0)
    const wins = results.filter((r) => r!.position === '1').length
    const podiums = results.filter((r) => Number(r!.position) <= 3).length
    const points = results.reduce((sum, r) => sum + Number(r!.points), 0)
    const avgFinish = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 20
    const reliability = results.length > 0 ? (finishes.length / results.length) * 100 : 0
    return { wins, podiums, points, avgFinish, reliability, races: results.length }
  }

  const stats1 = calcStats(races1)
  const stats2 = calcStats(races2)

  // Qualifying H2H
  const quali1 = quali1Query.data ?? []
  const quali2 = quali2Query.data ?? []
  let q1Wins = 0, q2Wins = 0
  for (const race of quali1) {
    const q1 = race.QualifyingResults?.find((q) => q.Driver.driverId === driver1Id)
    const q2 = quali2.find((r) => r.round === race.round)?.QualifyingResults?.find(
      (q) => q.Driver.driverId === driver2Id
    )
    if (q1 && q2) {
      const pos1 = Number(q1.position)
      const pos2 = Number(q2.position)
      if (pos1 < pos2) q1Wins++
      else if (pos2 < pos1) q2Wins++
    }
  }

  // Points over time chart
  const pointsOverTimeData = overTimeQuery.data.map(({ round, standings }) => {
    const s1 = standings.find((s) => s.driver.driverId === driver1Id)
    const s2 = standings.find((s) => s.driver.driverId === driver2Id)
    return {
      round: `R${round}`,
      [d1?.driver.code ?? 'D1']: s1?.points ?? null,
      [d2?.driver.code ?? 'D2']: s2?.points ?? null,
    }
  })

  // Radar chart data — normalize 0-100
  const maxWins = Math.max(stats1.wins, stats2.wins, 1)
  const maxPodiums = Math.max(stats1.podiums, stats2.podiums, 1)
  const maxPoints = Math.max(stats1.points, stats2.points, 1)

  const radarData = [
    {
      metric: 'Wins',
      [d1?.driver.code ?? 'D1']: (stats1.wins / maxWins) * 100,
      [d2?.driver.code ?? 'D2']: (stats2.wins / maxWins) * 100,
    },
    {
      metric: 'Podiums',
      [d1?.driver.code ?? 'D1']: (stats1.podiums / maxPodiums) * 100,
      [d2?.driver.code ?? 'D2']: (stats2.podiums / maxPodiums) * 100,
    },
    {
      metric: 'Points',
      [d1?.driver.code ?? 'D1']: (stats1.points / maxPoints) * 100,
      [d2?.driver.code ?? 'D2']: (stats2.points / maxPoints) * 100,
    },
    {
      metric: 'Avg Finish',
      [d1?.driver.code ?? 'D1']: Math.max(0, 100 - (stats1.avgFinish - 1) * 5),
      [d2?.driver.code ?? 'D2']: Math.max(0, 100 - (stats2.avgFinish - 1) * 5),
    },
    {
      metric: 'Reliability',
      [d1?.driver.code ?? 'D1']: stats1.reliability,
      [d2?.driver.code ?? 'D2']: stats2.reliability,
    },
    {
      metric: 'Quali H2H',
      [d1?.driver.code ?? 'D1']: q1Wins + q2Wins > 0 ? (q1Wins / (q1Wins + q2Wins)) * 100 : 50,
      [d2?.driver.code ?? 'D2']: q1Wins + q2Wins > 0 ? (q2Wins / (q1Wins + q2Wins)) * 100 : 50,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <GitCompare className="h-7 w-7 text-[#e10600]" />
          Head-to-Head
        </h1>
        <p className="text-gray-500 mt-1">Compare two drivers across {season}</p>
      </div>

      {/* Driver Selectors */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center py-2">
          <Select
            label="Driver 1"
            value={driver1Id}
            onChange={setDriver1Id}
            options={[{ value: '', label: 'Select driver...' }, ...driverOptions]}
            className="w-full sm:w-64"
          />
          <span className="text-2xl font-black text-gray-600">vs</span>
          <Select
            label="Driver 2"
            value={driver2Id}
            onChange={setDriver2Id}
            options={[{ value: '', label: 'Select driver...' }, ...driverOptions]}
            className="w-full sm:w-64"
          />
        </div>
      </Card>

      {driver1Id && driver2Id && d1 && d2 && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-4">
            {(
              [
                { label: 'Points', key: 'points' as const },
                { label: 'Wins', key: 'wins' as const },
                { label: 'Podiums', key: 'podiums' as const },
              ] as const
            ).map(({ label, key }) => (
              <Card key={label} className="text-center">
                <div className="flex justify-between items-baseline mb-2">
                  <span
                    className="text-2xl font-black"
                    style={{ color: d1.constructor.color }}
                  >
                    {stats1[key]}
                  </span>
                  <span className="text-xs text-gray-600">{label}</span>
                  <span
                    className="text-2xl font-black"
                    style={{ color: d2.constructor.color }}
                  >
                    {stats2[key]}
                  </span>
                </div>
                <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-l-full"
                    style={{
                      flex: stats1[key] || 0.1,
                      backgroundColor: d1.constructor.color,
                    }}
                  />
                  <div
                    className="h-full rounded-r-full"
                    style={{
                      flex: stats2[key] || 0.1,
                      backgroundColor: d2.constructor.color,
                    }}
                  />
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="text-center">
              <div className="text-xs text-gray-500 mb-2">Avg. Finish</div>
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-bold" style={{ color: d1.constructor.color }}>
                  P{stats1.avgFinish.toFixed(1)}
                </span>
                <span className="text-xl font-bold" style={{ color: d2.constructor.color }}>
                  P{stats2.avgFinish.toFixed(1)}
                </span>
              </div>
            </Card>
            <Card className="text-center">
              <div className="text-xs text-gray-500 mb-2">Reliability</div>
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-bold" style={{ color: d1.constructor.color }}>
                  {stats1.reliability.toFixed(0)}%
                </span>
                <span className="text-xl font-bold" style={{ color: d2.constructor.color }}>
                  {stats2.reliability.toFixed(0)}%
                </span>
              </div>
            </Card>
            <Card className="text-center">
              <div className="text-xs text-gray-500 mb-2">Qualifying H2H</div>
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-bold" style={{ color: d1.constructor.color }}>
                  {q1Wins}
                </span>
                <span className="text-xs text-gray-600">–</span>
                <span className="text-xl font-bold" style={{ color: d2.constructor.color }}>
                  {q2Wins}
                </span>
              </div>
            </Card>
          </div>

          {/* Radar Chart */}
          <Card>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Performance Radar</h2>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#ffffff10" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                />
                <Radar
                  name={d1.driver.code}
                  dataKey={d1.driver.code}
                  stroke={d1.constructor.color}
                  fill={d1.constructor.color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Radar
                  name={d2.driver.code}
                  dataKey={d2.driver.code}
                  stroke={d2.constructor.color}
                  fill={d2.constructor.color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-gray-400">{value}</span>
                  )}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Points Over Time */}
          {pointsOverTimeData.length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Points Progression</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={pointsOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                  <XAxis dataKey="round" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#ffffff0a' }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs">
                          <p className="text-gray-400 mb-1">{label}</p>
                          {payload.map((p: { color: string; name: string; value: number }) => (
                            <p key={p.name} style={{ color: p.color }}>
                              {p.name}: {p.value} pts
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={d1.driver.code}
                    stroke={d1.constructor.color}
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={d2.driver.code}
                    stroke={d2.constructor.color}
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-gray-400">{value}</span>
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}

      {(!driver1Id || !driver2Id) && (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <GitCompare className="h-12 w-12 mx-auto mb-3 text-gray-700" />
            <p className="text-sm">Select two drivers above to compare their {season} season</p>
          </div>
        </Card>
      )}
    </div>
  )
}
