import { Trophy, Building2, Flag, Calendar } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'
import { CARD_REGISTRY } from '@/components/dashboard/cardRegistry'
import { useDriverStandings, useConstructorStandings } from '@/hooks/useSeasonStandings'
import { useSeasonSchedule } from '@/hooks/useRaceData'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

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

export function Dashboard() {
  const { season } = useSeason()
  const { layout } = useDashboardLayout()
  const driversQuery = useDriverStandings(season)
  const constructorsQuery = useConstructorStandings(season)
  const scheduleQuery = useSeasonSchedule(season)

  const topDrivers = driversQuery.data?.slice(0, 5) ?? []
  const topConstructors = constructorsQuery.data?.slice(0, 5) ?? []
  const schedule = scheduleQuery.data ?? []
  const today = new Date()

  const pastRaces = schedule.filter((r) => new Date(r.date) < today)
  const nextRace = schedule.find((r) => new Date(r.date) >= today)
  const lastRace = pastRaces[pastRaces.length - 1]

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

      {/* Stat Cards (not customizable) */}
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

      {/* Main Grid: layout-driven */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {layout.map((entry) => {
          const Component = CARD_REGISTRY[entry.type].Component
          return <Component key={entry.id} />
        })}
      </div>
    </div>
  )
}
