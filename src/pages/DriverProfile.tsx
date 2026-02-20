import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Trophy, Medal, Circle, Zap } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { useSeason } from '@/context/SeasonContext'
import {
  getDriverCareerResults,
  getDriverSeasonResults,
  getDriverSeasonQualifying,
} from '@/api/jolpica'
import { getConstructorColor } from '@/constants/f1'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'


export function DriverProfile() {
  const { driverId } = useParams<{ driverId: string }>()
  const { season } = useSeason()

  const careerQuery = useQuery({
    queryKey: ['career', driverId],
    queryFn: () => getDriverCareerResults(driverId!),
    enabled: !!driverId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  })

  const seasonQuery = useQuery({
    queryKey: ['driverSeasonResults', season, driverId],
    queryFn: () => getDriverSeasonResults(season, driverId!),
    enabled: !!driverId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  })

  const qualifyingQuery = useQuery({
    queryKey: ['driverSeasonQualifying', season, driverId],
    queryFn: () => getDriverSeasonQualifying(season, driverId!),
    enabled: !!driverId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  })

  const careerRaces = careerQuery.data ?? []
  const seasonRaces = seasonQuery.data ?? []

  // Career stats
  const wins = careerRaces.filter((r) => r.Results?.[0]?.position === '1').length
  const podiums = careerRaces.filter(
    (r) => Number(r.Results?.[0]?.position ?? 99) <= 3
  ).length
  const poles = careerRaces.filter(
    (r) => r.Results?.[0]?.grid === '1'
  ).length
  const fastestLaps = careerRaces.filter(
    (r) => r.Results?.[0]?.FastestLap?.rank === '1'
  ).length

  // Driver info from most recent race
  const latestResult = careerRaces[careerRaces.length - 1]?.Results?.[0]
  const driver = latestResult?.Driver
  const currentConstructor = latestResult?.Constructor

  // Career arc: points per season
  const careerByYear = new Map<number, number>()
  for (const race of careerRaces) {
    const yr = Number(race.season)
    careerByYear.set(yr, (careerByYear.get(yr) ?? 0) + Number(race.Results?.[0]?.points ?? 0))
  }
  const careerArcData = Array.from(careerByYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, points]) => ({ year, points }))

  // Season results table
  const seasonResults = seasonRaces.map((race) => {
    const result = race.Results?.[0]
    return {
      round: Number(race.round),
      raceName: race.raceName.replace(' Grand Prix', ''),
      grid: Number(result?.grid ?? 0),
      finish: Number(result?.position ?? 0),
      points: Number(result?.points ?? 0),
      status: result?.status ?? 'Unknown',
      constructorId: result?.Constructor.constructorId ?? '',
      color: getConstructorColor(result?.Constructor.constructorId ?? ''),
    }
  })

  // Qualifying vs race scatter
  const qualifyingRaces = qualifyingQuery.data ?? []
  const scatterData = seasonResults
    .map((r) => {
      const qRace = qualifyingRaces.find((q) => Number(q.round) === r.round)
      const qResult = qRace?.QualifyingResults?.find(
        (q) => q.Driver.driverId === driverId
      )
      return {
        grid: r.grid,
        finish: r.finish,
        raceName: r.raceName,
        color: r.color,
        hasQ: !!qResult,
      }
    })
    .filter((d) => d.grid > 0 && d.finish > 0)

  return (
    <div className="space-y-6">
      <Link
        to="/drivers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Drivers
      </Link>

      {/* Hero */}
      <Card>
        {careerQuery.isLoading ? (
          <Skeleton variant="card" />
        ) : careerQuery.isError ? (
          <ErrorState onRetry={() => careerQuery.refetch()} />
        ) : !driver ? (
          <div className="text-gray-500">Driver not found</div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <div
                className="h-1 w-16 rounded-full mb-3"
                style={{
                  backgroundColor: getConstructorColor(
                    currentConstructor?.constructorId ?? ''
                  ),
                }}
              />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {driver.givenName} {driver.familyName}
              </h1>
              <p className="text-gray-400 mt-1">
                {currentConstructor?.name} · {driver.nationality}
              </p>
              {driver.permanentNumber && (
                <span
                  className="text-4xl font-black mt-2 block"
                  style={{
                    color: `${getConstructorColor(currentConstructor?.constructorId ?? '')}66`,
                  }}
                >
                  #{driver.permanentNumber}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Wins', value: wins, icon: Trophy },
                { label: 'Podiums', value: podiums, icon: Medal },
                { label: 'Poles', value: poles, icon: Circle },
                { label: 'Fastest Laps', value: fastestLaps, icon: Zap },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="h-5 w-5 mx-auto mb-1 text-gray-500" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Career Arc */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Career Points Arc</h2>
        <p className="text-xs text-gray-500 mb-4">Total championship points per season</p>
        {careerQuery.isLoading ? (
          <Skeleton variant="chart" height={240} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={careerArcData}>
              <defs>
                <linearGradient id="careerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={getConstructorColor(
                      currentConstructor?.constructorId ?? ''
                    )}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={getConstructorColor(
                      currentConstructor?.constructorId ?? ''
                    )}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
              <XAxis
                dataKey="year"
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
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs">
                      <p className="text-gray-400">{label}</p>
                      <p className="text-white font-bold">{payload[0]?.value} pts</p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="points"
                stroke={getConstructorColor(currentConstructor?.constructorId ?? '')}
                strokeWidth={2}
                fill="url(#careerGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Season Results Table */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{season} Season Results</h2>
        {seasonQuery.isLoading ? (
          <Skeleton variant="chart" height={320} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-white/[0.06]">
                  <th className="pb-3 text-left">Round</th>
                  <th className="pb-3 text-left">Race</th>
                  <th className="pb-3 text-right">Grid</th>
                  <th className="pb-3 text-right">Finish</th>
                  <th className="pb-3 text-right">Pts</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {seasonResults.map((r) => (
                  <tr key={r.round} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 text-gray-600 text-xs">R{r.round}</td>
                    <td className="py-2.5">
                      <Link
                        to={`/races/${r.round}`}
                        className="text-gray-300 hover:text-[#e10600] transition-colors"
                      >
                        {r.raceName}
                      </Link>
                    </td>
                    <td className="py-2.5 text-right text-gray-400">{r.grid || '—'}</td>
                    <td
                      className="py-2.5 text-right font-bold"
                      style={{ color: r.finish <= 3 ? '#e10600' : 'inherit' }}
                    >
                      {r.finish || '—'}
                    </td>
                    <td className="py-2.5 text-right text-gray-900 dark:text-white font-bold">
                      {r.points || '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          r.status === 'Finished' || r.status.startsWith('+')
                            ? 'bg-green-900/20 text-green-500'
                            : 'bg-red-900/20 text-red-400'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Grid vs Finish Scatter */}
      {scatterData.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Qualifying vs Race Performance</h2>
          <p className="text-xs text-gray-500 mb-4">
            Grid position vs finishing position — dots above diagonal = improved during race
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
              <XAxis
                dataKey="grid"
                type="number"
                name="Grid Position"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff0a' }}
                label={{
                  value: 'Grid Position',
                  position: 'bottom',
                  fill: '#6b7280',
                  fontSize: 11,
                }}
                domain={[1, 20]}
              />
              <YAxis
                dataKey="finish"
                type="number"
                name="Finish Position"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={30}
                reversed
                domain={[1, 20]}
              />
              <ReferenceLine
                segment={[{ x: 1, y: 1 }, { x: 20, y: 20 }]}
                stroke="#ffffff20"
                strokeDasharray="5 3"
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs">
                      <p className="text-gray-300">{d?.raceName}</p>
                      <p className="text-gray-400">Grid: P{d?.grid} → Finish: P{d?.finish}</p>
                    </div>
                  )
                }}
              />
              <Scatter
                data={scatterData}
                fill={getConstructorColor(currentConstructor?.constructorId ?? '')}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Season Points Chart */}
      {seasonResults.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">{season} Points per Race</h2>
          <p className="text-xs text-gray-500 mb-4">Points scored in each race weekend</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={seasonResults}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
              <XAxis
                dataKey="round"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={{ stroke: '#ffffff0a' }}
                tickFormatter={(v) => `R${v}`}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs">
                      <p className="text-gray-400">{payload[0]?.payload?.raceName}</p>
                      <p className="text-white font-bold">{payload[0]?.value} pts</p>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="points"
                stroke={getConstructorColor(currentConstructor?.constructorId ?? '')}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
