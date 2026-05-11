import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useConstructorStandings } from '@/hooks/useSeasonStandings'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConstructorBadge } from '@/components/ui/Badge'

export function ConstructorStandingsCard() {
  const { season } = useSeason()
  const constructorsQuery = useConstructorStandings(season)
  const topConstructors = constructorsQuery.data?.slice(0, 5) ?? []

  return (
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
  )
}
