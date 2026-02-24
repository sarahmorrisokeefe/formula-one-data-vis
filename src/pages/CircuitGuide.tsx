import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSeason } from '@/context/SeasonContext'
import { getCircuits } from '@/api/jolpica'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'

export function CircuitGuide() {
  const { season } = useSeason()
  const [search, setSearch] = useState('')

  const circuitsQuery = useQuery({
    queryKey: ['circuits', season],
    queryFn: () => getCircuits(season),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  })

  const circuits = (circuitsQuery.data ?? []).filter((c) => {
    const q = search.toLowerCase()
    return (
      c.circuitName.toLowerCase().includes(q) ||
      c.Location.country.toLowerCase().includes(q) ||
      c.Location.locality.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3 sm:text-3xl">
            <MapPin className="h-6 w-6 text-[#e10600] sm:h-7 sm:w-7" />
            Circuit Guide
          </h1>
          <p className="text-gray-500 mt-1">
            {season} calendar · {circuits.length} circuits
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search circuits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e10600]/50 dark:border-white/10 dark:bg-white/[0.05] dark:text-gray-200 dark:placeholder-gray-600"
          />
        </div>
      </div>

      {circuitsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      ) : circuitsQuery.isError ? (
        <ErrorState onRetry={() => circuitsQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {circuits.map((circuit) => (
            <Link
              key={circuit.circuitId}
              to={`/circuits/${circuit.circuitId}`}
            >
              <Card className="hover:border-[#e10600]/30 transition-all cursor-pointer group h-full">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded">
                    {circuit.Location.country}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#e10600] transition-colors leading-tight mb-1">
                  {circuit.circuitName}
                </h3>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  {circuit.Location.locality}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
