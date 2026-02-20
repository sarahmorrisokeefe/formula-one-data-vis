import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Trophy } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { getCircuitRaces } from '@/api/jolpica'
import { getConstructorColor } from '@/constants/f1'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

function lapTimeToSeconds(time: string): number | null {
  if (!time) return null
  const parts = time.split(':')
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1])
  return parseFloat(time)
}

export function CircuitDetail() {
  const { circuitId } = useParams<{ circuitId: string }>()

  const racesQuery = useQuery({
    queryKey: ['circuitRaces', circuitId],
    queryFn: () => getCircuitRaces(circuitId!),
    enabled: !!circuitId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  })

  const races = (racesQuery.data ?? []).sort((a, b) => Number(a.season) - Number(b.season))
  const latestRace = races[races.length - 1]
  const circuit = latestRace?.Circuit

  // Lap record progression from fastest laps
  const lapRecordData = races
    .filter((r) => r.Results?.[0]?.FastestLap?.Time?.time)
    .map((r) => ({
      year: Number(r.season),
      seconds: lapTimeToSeconds(r.Results![0].FastestLap!.Time.time),
      time: r.Results![0].FastestLap!.Time.time,
      driver: `${r.Results![0].Driver.givenName[0]}. ${r.Results![0].Driver.familyName}`,
    }))
    .filter((d) => d.seconds !== null)

  // Fastest ever lap record
  const lapRecord = lapRecordData.reduce(
    (best, curr) => (curr.seconds! < (best?.seconds ?? Infinity) ? curr : best),
    null as (typeof lapRecordData)[0] | null
  )

  return (
    <div className="space-y-6">
      <Link
        to="/circuits"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Circuits
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {circuit?.circuitName ?? circuitId}
        </h1>
        {circuit && (
          <div className="flex items-center gap-1 text-gray-500 mt-1">
            <MapPin className="h-4 w-4" />
            {circuit.Location.locality}, {circuit.Location.country}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-white">{races.length}</div>
          <div className="text-xs text-gray-500 mt-1">Grand Prix held</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-white">
            {races[0] ? Number(races[0].season) : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">First Grand Prix</div>
        </Card>
        <Card className="text-center">
          <div className="text-lg font-bold text-white">
            {lapRecord?.time ?? '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Lap record</div>
          {lapRecord && (
            <div className="text-xs text-gray-600">{lapRecord.driver} ({lapRecord.year})</div>
          )}
        </Card>
        <Card className="text-center">
          <div className="text-lg font-bold text-white">
            {circuit?.Location.lat && circuit?.Location.long
              ? `${Number(circuit.Location.lat).toFixed(2)}°`
              : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Latitude</div>
        </Card>
      </div>

      {/* Lap Record Progression */}
      {lapRecordData.length > 2 && (
        <Card>
          <h2 className="font-semibold text-white mb-1">Lap Record Progression</h2>
          <p className="text-xs text-gray-500 mb-4">Fastest race lap each year</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lapRecordData}>
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
                width={50}
                tickFormatter={(v) => `${Math.floor(v / 60)}:${(v % 60).toFixed(0).padStart(2, '0')}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs">
                      <p className="text-gray-400">{d?.year}</p>
                      <p className="text-white font-bold">{d?.time}</p>
                      <p className="text-gray-400">{d?.driver}</p>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="seconds"
                stroke="#e10600"
                strokeWidth={2}
                dot={{ r: 3, fill: '#e10600', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Winner History */}
      <Card>
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#e10600]" />
          Race Winners
        </h2>
        {racesQuery.isLoading ? (
          <Skeleton variant="chart" height={400} />
        ) : racesQuery.isError ? (
          <ErrorState onRetry={() => racesQuery.refetch()} />
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0d0d17]">
                <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-white/[0.06]">
                  <th className="pb-3 text-left">Year</th>
                  <th className="pb-3 text-left">Winner</th>
                  <th className="pb-3 text-left">Team</th>
                  <th className="pb-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {[...races].reverse().map((race) => {
                  const winner = race.Results?.[0]
                  if (!winner) return null
                  const color = getConstructorColor(winner.Constructor.constructorId)
                  return (
                    <tr key={race.season} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 font-mono text-gray-400">{race.season}</td>
                      <td className="py-2.5">
                        <span className="font-semibold text-white">
                          {winner.Driver.givenName} {winner.Driver.familyName}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className="text-sm" style={{ color }}>
                          {winner.Constructor.name}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-gray-500 text-xs font-mono">
                        {winner.Time?.time ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
