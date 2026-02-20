import { Link } from 'react-router-dom'
import { Flag, MapPin, Calendar } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useSeasonSchedule } from '@/hooks/useRaceData'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

export function RaceCenter() {
  const { season } = useSeason()
  const scheduleQuery = useSeasonSchedule(season)
  const today = new Date()

  const schedule = scheduleQuery.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Flag className="h-7 w-7 text-[#e10600]" />
          {season} Race Calendar
        </h1>
        <p className="text-gray-500 mt-1">
          {schedule.length} races · Click a race for detailed analysis
        </p>
      </div>

      {scheduleQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      ) : scheduleQuery.isError ? (
        <ErrorState onRetry={() => scheduleQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedule.map((race) => {
            const isPast = new Date(race.date) < today
            const isNext =
              !isPast &&
              schedule.find((r) => new Date(r.date) >= today)?.round ===
                race.round

            return (
              <Link key={race.round} to={`/races/${race.round}`}>
                <Card
                  className={`hover:border-[#e10600]/40 transition-all cursor-pointer group ${
                    isNext
                      ? 'border-[#e10600]/40 bg-[#e10600]/[0.04]'
                      : isPast
                      ? 'opacity-70 hover:opacity-100'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-600 bg-white/[0.06] px-2 py-0.5 rounded">
                        R{race.round}
                      </span>
                      {isNext && (
                        <span className="text-xs font-bold text-[#e10600] bg-[#e10600]/10 px-2 py-0.5 rounded">
                          NEXT
                        </span>
                      )}
                      {isPast && (
                        <span className="text-xs text-gray-600 bg-white/[0.03] px-2 py-0.5 rounded">
                          COMPLETED
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-[#e10600] transition-colors leading-tight mb-1">
                    {race.raceName}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <MapPin className="h-3 w-3" />
                    {race.location}, {race.country}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {new Date(race.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
