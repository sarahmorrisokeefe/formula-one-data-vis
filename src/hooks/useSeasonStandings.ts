import { useQuery, useQueries } from '@tanstack/react-query'
import { getDriverStandings, getConstructorStandings, getSeasonSchedule } from '@/api/jolpica'
import { getConstructorColor } from '@/constants/f1'
import { CURRENT_YEAR } from '@/constants/f1'
import type { DriverStandingEntry, ConstructorStandingEntry } from '@/types/domain'
import type { DriverStanding, ConstructorStanding } from '@/types/api'

const STALE_HISTORICAL = Infinity
const STALE_CURRENT = 1000 * 60 * 30

function staleTime(season: number) {
  return season < CURRENT_YEAR ? STALE_HISTORICAL : STALE_CURRENT
}

function mapDriverStanding(d: DriverStanding): DriverStandingEntry {
  const ctor = d.Constructors[0]
  return {
    position: Number(d.position),
    points: Number(d.points),
    wins: Number(d.wins),
    driver: {
      driverId: d.Driver.driverId,
      code: d.Driver.code ?? d.Driver.familyName.slice(0, 3).toUpperCase(),
      number: d.Driver.permanentNumber ?? '',
      firstName: d.Driver.givenName,
      lastName: d.Driver.familyName,
      fullName: `${d.Driver.givenName} ${d.Driver.familyName}`,
      nationality: d.Driver.nationality,
      dateOfBirth: d.Driver.dateOfBirth,
    },
    constructor: ctor
      ? {
          constructorId: ctor.constructorId,
          name: ctor.name,
          nationality: ctor.nationality,
          color: getConstructorColor(ctor.constructorId),
        }
      : { constructorId: 'unknown', name: 'Unknown', nationality: '', color: '#888' },
  }
}

function mapConstructorStanding(c: ConstructorStanding): ConstructorStandingEntry {
  return {
    position: Number(c.position),
    points: Number(c.points),
    wins: Number(c.wins),
    constructor: {
      constructorId: c.Constructor.constructorId,
      name: c.Constructor.name,
      nationality: c.Constructor.nationality,
      color: getConstructorColor(c.Constructor.constructorId),
    },
  }
}

export function useDriverStandings(season: number) {
  return useQuery({
    queryKey: ['driverStandings', season],
    queryFn: async () => {
      const { standings } = await getDriverStandings(season)
      return standings.map(mapDriverStanding)
    },
    staleTime: staleTime(season),
    gcTime: 1000 * 60 * 60 * 24,
  })
}

export function useConstructorStandings(season: number) {
  return useQuery({
    queryKey: ['constructorStandings', season],
    queryFn: async () => {
      const { standings } = await getConstructorStandings(season)
      return standings.map(mapConstructorStanding)
    },
    staleTime: staleTime(season),
    gcTime: 1000 * 60 * 60 * 24,
  })
}

export function useDriverStandingsOverTime(season: number) {
  const scheduleQuery = useQuery({
    queryKey: ['schedule', season],
    queryFn: () => getSeasonSchedule(season),
    staleTime: staleTime(season),
    gcTime: 1000 * 60 * 60 * 24,
  })

  const roundCount = scheduleQuery.data?.length ?? 0

  const roundQueries = useQueries({
    queries: Array.from({ length: roundCount }, (_, i) => ({
      queryKey: ['driverStandings', season, i + 1],
      queryFn: async () => {
        const { standings } = await getDriverStandings(season, i + 1)
        return { round: i + 1, standings: standings.map(mapDriverStanding) }
      },
      enabled: roundCount > 0,
      staleTime: STALE_HISTORICAL, // per-round standings never change
      gcTime: 1000 * 60 * 60 * 24,
    })),
  })

  const isLoading = scheduleQuery.isLoading || roundQueries.some(q => q.isLoading)
  const isError = scheduleQuery.isError || roundQueries.some(q => q.isError)

  const data = roundQueries
    .filter(q => q.data != null)
    .map(q => q.data!)
    .sort((a, b) => a.round - b.round)

  return { data, isLoading, isError }
}

export function useConstructorStandingsOverTime(season: number) {
  const scheduleQuery = useQuery({
    queryKey: ['schedule', season],
    queryFn: () => getSeasonSchedule(season),
    staleTime: staleTime(season),
    gcTime: 1000 * 60 * 60 * 24,
  })

  const roundCount = scheduleQuery.data?.length ?? 0

  const roundQueries = useQueries({
    queries: Array.from({ length: roundCount }, (_, i) => ({
      queryKey: ['constructorStandings', season, i + 1],
      queryFn: async () => {
        const { standings } = await getConstructorStandings(season, i + 1)
        return { round: i + 1, standings: standings.map(mapConstructorStanding) }
      },
      enabled: roundCount > 0,
      staleTime: STALE_HISTORICAL,
      gcTime: 1000 * 60 * 60 * 24,
    })),
  })

  const isLoading = scheduleQuery.isLoading || roundQueries.some(q => q.isLoading)
  const isError = scheduleQuery.isError || roundQueries.some(q => q.isError)

  const data = roundQueries
    .filter(q => q.data != null)
    .map(q => q.data!)
    .sort((a, b) => a.round - b.round)

  return { data, isLoading, isError }
}
