import { Link } from 'react-router-dom'
import { Trophy, Building2, Flag, Calendar, TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useSeason } from '@/context/SeasonContext'
import { useDriverStandings, useConstructorStandings } from '@/hooks/useSeasonStandings'
import { useSeasonSchedule } from '@/hooks/useRaceData'
import { Card } from '@/components/ui/Card'
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConstructorBadge } from '@/components/ui/Badge'

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  color?: string
  icon?: typeof Trophy
}) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-gray-600" />}
      </div>
      <div
        className="text-2xl font-bold tracking-tight"
        style={{ color: color ?? 'inherit' }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </Card>
  )
}

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

export function Dashboard() {
  const { season } = useSeason()
  const driversQuery = useDriverStandings(season)
  const constructorsQuery = useConstructorStandings(season)
  const scheduleQuery = useSeasonSchedule(season)

  const topDrivers = driversQuery.data?.slice(0, 5) ?? []
  const topConstructors = constructorsQuery.data?.slice(0, 5) ?? []
  const schedule = scheduleQuery.data ?? []
  const today = new Date()

  const pastRaces = schedule.filter(r => new Date(r.date) < today)
  const nextRace = schedule.find(r => new Date(r.date) >= today)
  const lastRace = pastRaces[pastRaces.length - 1]

  const sparklineData = topDrivers.slice(0, 3).map((d) => ({
    name: d.driver.code,
    pts: d.points,
  }))

  const daysToNextRace = nextRace
    ? Math.ceil(
        (new Date(nextRace.date).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          {season} Season
        </h1>
        <p className="text-gray-500 mt-1">
          Formula 1 Championship Overview
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {driversQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" />
          ))
        ) : driversQuery.isError ? (
          <div className="col-span-4">
            <ErrorState onRetry={() => driversQuery.refetch()} />
          </div>
        ) : (
          <>
            <StatCard
              label="Championship Leader"
              value={topDrivers[0]?.driver.code ?? '—'}
              sub={`${topDrivers[0]?.points ?? 0} points`}
              color={topDrivers[0]?.constructor.color}
              icon={Trophy}
            />
            <StatCard
              label="Leading Constructor"
              value={topConstructors[0]?.constructor.name ?? '—'}
              sub={`${topConstructors[0]?.points ?? 0} points`}
              color={topConstructors[0]?.constructor.color}
              icon={Building2}
            />
            <StatCard
              label="Rounds Completed"
              value={String(pastRaces.length)}
              sub={`of ${schedule.length} races`}
              icon={Flag}
            />
            <StatCard
              label={nextRace ? 'Next Race' : 'Season'}
              value={nextRace?.raceName.replace('Grand Prix', 'GP') ?? 'Complete'}
              sub={
                daysToNextRace != null
                  ? `In ${daysToNextRace} day${daysToNextRace === 1 ? '' : 's'}`
                  : lastRace?.raceName ?? ''
              }
              icon={Calendar}
            />
          </>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Driver Standings */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#e10600]" />
              Driver Standings
            </h2>
            <Link
              to="/championship/drivers"
              className="text-xs text-gray-500 hover:text-[#e10600] transition-colors"
            >
              View all →
            </Link>
          </div>
          {driversQuery.isLoading ? (
            <TableSkeleton rows={5} />
          ) : driversQuery.isError ? (
            <ErrorState onRetry={() => driversQuery.refetch()} />
          ) : (
            <div className="space-y-2">
              {topDrivers.map((entry) => (
                <Link
                  key={entry.driver.driverId}
                  to={`/drivers/${entry.driver.driverId}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors group"
                >
                  <span className="w-6 text-center text-sm font-bold text-gray-500">
                    {entry.position}
                  </span>
                  <span
                    className="h-8 w-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.constructor.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#e10600] transition-colors truncate">
                      {entry.driver.firstName} {entry.driver.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.constructor.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {entry.points}
                    </div>
                    <div className="text-xs text-gray-600">pts</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Constructor Standings */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#e10600]" />
              Constructor Standings
            </h2>
            <Link
              to="/championship/constructors"
              className="text-xs text-gray-500 hover:text-[#e10600] transition-colors"
            >
              View all →
            </Link>
          </div>
          {constructorsQuery.isLoading ? (
            <TableSkeleton rows={5} />
          ) : constructorsQuery.isError ? (
            <ErrorState onRetry={() => constructorsQuery.refetch()} />
          ) : (
            <div className="space-y-2">
              {topConstructors.map((entry) => (
                <div
                  key={entry.constructor.constructorId}
                  className="flex items-center gap-3 rounded-lg px-2 py-2"
                >
                  <span className="w-6 text-center text-sm font-bold text-gray-500">
                    {entry.position}
                  </span>
                  <ConstructorBadge
                    name={entry.constructor.name}
                    color={entry.constructor.color}
                  />
                  <div className="flex-1" />
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {entry.points}
                    <span className="ml-1 text-xs font-normal text-gray-600">pts</span>
                  </div>
                  <div className="text-xs text-gray-600 w-12 text-right">
                    {entry.wins}W
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

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

        {/* Race Schedule */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#e10600]" />
              Race Calendar
            </h2>
            <Link
              to="/races"
              className="text-xs text-gray-500 hover:text-[#e10600] transition-colors"
            >
              View all →
            </Link>
          </div>
          {scheduleQuery.isLoading ? (
            <TableSkeleton rows={5} />
          ) : scheduleQuery.isError ? (
            <ErrorState onRetry={() => scheduleQuery.refetch()} />
          ) : (
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {schedule.map((race) => {
                const isPast = new Date(race.date) < today
                const isNext = race.circuitId === nextRace?.circuitId
                return (
                  <Link
                    key={race.round}
                    to={`/races/${race.round}`}
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.04] transition-colors ${isNext ? 'bg-[#e10600]/10' : ''}`}
                  >
                    <span className="w-6 text-xs text-gray-600 text-center">
                      R{race.round}
                    </span>
                    <span
                      className={`flex-1 truncate ${isPast ? 'text-gray-400' : isNext ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-300'}`}
                    >
                      {race.raceName.replace(' Grand Prix', '')}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(race.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
