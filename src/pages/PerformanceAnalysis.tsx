import { useMemo } from 'react'
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
import { BarChart2 } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useAllSeasonResults } from '@/hooks/useRaceData'
import { useDriverStandings } from '@/hooks/useSeasonStandings'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { DriverHeatmap } from '@/components/charts/DriverHeatmap'


function categorizeDNF(status: string): string | null {
  if (status === 'Finished' || status.startsWith('+')) return null
  if (status === 'Accident' || status === 'Collision') return 'Accident'
  if (['Engine', 'Hydraulics', 'Gearbox', 'Brakes', 'Transmission', 'Electrical', 'Suspension', 'Turbo', 'Power Unit', 'ERS', 'Oil pressure', 'Overheating', 'Fuel system'].includes(status)) return 'Mechanical'
  if (status === 'Puncture') return 'Puncture'
  return 'Other'
}

export function PerformanceAnalysis() {
  const { season } = useSeason()
  const standingsQuery = useDriverStandings(season)
  const allResultsQuery = useAllSeasonResults(season)

  const drivers = standingsQuery.data ?? []

  // Build heatmap matrix: driverId -> round -> finish position
  const { heatmapData, rounds } = useMemo(() => {
    if (!allResultsQuery.data) return { heatmapData: [], rounds: [] }

    const allRounds = new Set<number>()
    const matrix = new Map<string, Map<number, number | null>>()

    for (const race of allResultsQuery.data) {
      const round = Number(race.round)
      allRounds.add(round)
      for (const result of race.Results ?? []) {
        const driverId = result.Driver.driverId
        if (!matrix.has(driverId)) matrix.set(driverId, new Map())
        const pos = result.positionText === 'R' ? null : Number(result.position)
        matrix.get(driverId)!.set(round, pos)
      }
    }

    const sortedRounds = Array.from(allRounds).sort((a, b) => a - b)

    return {
      heatmapData: drivers.map((d) => ({
        driverId: d.driver.driverId,
        code: d.driver.code,
        color: d.constructor.color,
        results: sortedRounds.map((r) => ({
          round: r,
          position: matrix.get(d.driver.driverId)?.get(r) ?? null,
        })),
      })),
      rounds: sortedRounds,
    }
  }, [allResultsQuery.data, drivers])

  // DNF tracker
  const dnfData = useMemo(() => {
    if (!allResultsQuery.data) return []
    const dnfByDriver = new Map<string, { accident: number; mechanical: number; puncture: number; other: number }>()

    for (const race of allResultsQuery.data) {
      for (const result of race.Results ?? []) {
        const driverId = result.Driver.driverId
        const cat = categorizeDNF(result.status)
        if (!cat) continue
        if (!dnfByDriver.has(driverId)) {
          dnfByDriver.set(driverId, { accident: 0, mechanical: 0, puncture: 0, other: 0 })
        }
        const entry = dnfByDriver.get(driverId)!
        if (cat === 'Accident') entry.accident++
        else if (cat === 'Mechanical') entry.mechanical++
        else if (cat === 'Puncture') entry.puncture++
        else entry.other++
      }
    }

    return drivers
      .filter((d) => dnfByDriver.has(d.driver.driverId))
      .map((d) => {
        const dnfs = dnfByDriver.get(d.driver.driverId)!
        return {
          code: d.driver.code,
          color: d.constructor.color,
          ...dnfs,
          total: dnfs.accident + dnfs.mechanical + dnfs.puncture + dnfs.other,
        }
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [allResultsQuery.data, drivers])

  // Reliability: % races finished per constructor
  const reliabilityData = useMemo(() => {
    if (!allResultsQuery.data) return []
    const byConstructor = new Map<string, { finished: number; total: number; color: string; name: string }>()

    for (const race of allResultsQuery.data) {
      for (const result of race.Results ?? []) {
        const cid = result.Constructor.constructorId
        if (!byConstructor.has(cid)) {
          byConstructor.set(cid, {
            finished: 0,
            total: 0,
            color: result.Constructor.name,
            name: result.Constructor.name,
          })
        }
        const entry = byConstructor.get(cid)!
        entry.total++
        if (result.status === 'Finished' || result.status.startsWith('+')) {
          entry.finished++
        }
      }
    }

    return Array.from(byConstructor.entries())
      .map(([cid, data]) => ({
        name: data.name,
        reliability: parseFloat(((data.finished / data.total) * 100).toFixed(1)),
        color: drivers.find((d) => d.constructor.constructorId === cid)?.constructor.color ?? '#888',
      }))
      .sort((a, b) => b.reliability - a.reliability)
  }, [allResultsQuery.data, drivers])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3 sm:text-3xl">
          <BarChart2 className="h-6 w-6 text-[#e10600] sm:h-7 sm:w-7" />
          Performance Analysis
        </h1>
        <p className="text-gray-500 mt-1">
          {season} season-wide statistics and reliability data
        </p>
      </div>

      {/* Heatmap */}
      <Card padding="none">
        <div className="p-4 pb-2">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Driver Performance Heatmap</h2>
          <p className="text-xs text-gray-500">
            Finish position by round — red = P1, dark = DNF/DNS
          </p>
        </div>
        {allResultsQuery.isLoading || standingsQuery.isLoading ? (
          <Skeleton variant="chart" height={400} className="m-4" />
        ) : allResultsQuery.isError ? (
          <ErrorState onRetry={() => allResultsQuery.refetch()} />
        ) : (
          <DriverHeatmap data={heatmapData} rounds={rounds} />
        )}
      </Card>

      {/* DNF Tracker */}
      {dnfData.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">DNF Tracker</h2>
          <p className="text-xs text-gray-500 mb-4">
            Retirements by category — drivers with at least one DNF
          </p>
          <div className="flex gap-4 mb-3 flex-wrap">
            {[
              { key: 'mechanical', color: '#f59e0b', label: 'Mechanical' },
              { key: 'accident', color: '#ef4444', label: 'Accident' },
              { key: 'puncture', color: '#8b5cf6', label: 'Puncture' },
              { key: 'other', color: '#6b7280', label: 'Other' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={Math.max(200, dnfData.length * 28)}>
            <BarChart
              data={dnfData}
              layout="vertical"
              margin={{ top: 5, right: 60, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#ffffff0a' }} />
              <YAxis type="category" dataKey="code" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                cursor={{ fill: '#ffffff06' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs space-y-1">
                      <p className="font-bold text-white">{d?.code}</p>
                      <p className="text-amber-400">Mechanical: {d?.mechanical}</p>
                      <p className="text-red-400">Accident: {d?.accident}</p>
                      <p className="text-purple-400">Puncture: {d?.puncture}</p>
                      <p className="text-gray-400">Other: {d?.other}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="mechanical" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="accident" stackId="a" fill="#ef4444" />
              <Bar dataKey="puncture" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="other" stackId="a" fill="#6b7280" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Constructor Reliability */}
      {reliabilityData.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Constructor Reliability</h2>
          <p className="text-xs text-gray-500 mb-4">Percentage of race entries classified as Finished</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={reliabilityData}
              margin={{ top: 5, right: 20, left: 0, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={{ stroke: '#ffffff0a' }}
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                cursor={{ fill: '#ffffff06' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs">
                      <p style={{ color: payload[0]?.payload?.color }}>
                        {payload[0]?.payload?.name}: {payload[0]?.value}%
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="reliability" radius={[4, 4, 0, 0]}>
                {reliabilityData.map((entry, i) => (
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
