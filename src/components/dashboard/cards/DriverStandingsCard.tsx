import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useDriverStandings } from '@/hooks/useSeasonStandings'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

export function DriverStandingsCard() {
  const { season } = useSeason()
  const driversQuery = useDriverStandings(season)
  const topDrivers = driversQuery.data?.slice(0, 5) ?? []

  return (
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
  )
}
