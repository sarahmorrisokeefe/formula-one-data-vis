import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useSeasonSchedule } from '@/hooks/useRaceData'
import { Card } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

export function RaceCalendarCard() {
  const { season } = useSeason()
  const scheduleQuery = useSeasonSchedule(season)
  const schedule = scheduleQuery.data ?? []
  const today = new Date()
  const nextRace = schedule.find((r) => new Date(r.date) >= today)

  return (
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
  )
}
