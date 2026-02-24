import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Search } from 'lucide-react'
import { useSeason } from '@/context/SeasonContext'
import { useDriverStandings } from '@/hooks/useSeasonStandings'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

export function DriversList() {
  const { season } = useSeason()
  const standingsQuery = useDriverStandings(season)
  const [search, setSearch] = useState('')

  const drivers = (standingsQuery.data ?? []).filter((d) => {
    const q = search.toLowerCase()
    return (
      d.driver.fullName.toLowerCase().includes(q) ||
      d.driver.code.toLowerCase().includes(q) ||
      d.constructor.name.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3 sm:text-3xl">
            <Users className="h-6 w-6 text-[#e10600] sm:h-7 sm:w-7" />
            {season} Drivers
          </h1>
          <p className="text-gray-500 mt-1">Select a driver to view their full profile</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e10600]/50 dark:border-white/10 dark:bg-white/[0.05] dark:text-gray-200 dark:placeholder-gray-600"
          />
        </div>
      </div>

      {standingsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      ) : standingsQuery.isError ? (
        <ErrorState onRetry={() => standingsQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {drivers.map((entry) => (
            <Link key={entry.driver.driverId} to={`/drivers/${entry.driver.driverId}`}>
              <Card className="hover:border-white/20 transition-all cursor-pointer group h-full">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl font-black text-gray-700 dark:text-gray-600">
                    P{entry.position}
                  </span>
                  {entry.driver.number && (
                    <span
                      className="text-2xl font-black"
                      style={{ color: `${entry.constructor.color}66` }}
                    >
                      #{entry.driver.number}
                    </span>
                  )}
                </div>
                <div
                  className="h-0.5 w-10 rounded-full mb-3"
                  style={{ backgroundColor: entry.constructor.color }}
                />
                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-[#e10600] transition-colors leading-tight">
                  {entry.driver.firstName}
                  <br />
                  {entry.driver.lastName}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{entry.constructor.name}</p>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{entry.points}</span>
                  <span className="text-xs text-gray-600">pts</span>
                  <span className="ml-auto text-xs text-gray-600">{entry.wins}W</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
