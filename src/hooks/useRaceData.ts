import { useQuery } from '@tanstack/react-query'
import {
  getSeasonSchedule,
  getRaceResults,
  getQualifyingResults,
  getLapTimes,
  getPitStops,
  getAllSeasonResults,
  getAllSeasonQualifying,
} from '@/api/jolpica'
import { getStints, getPits, getRaceSession } from '@/api/openf1'
import { getConstructorColor } from '@/constants/f1'
import { CURRENT_YEAR } from '@/constants/f1'
import type { RaceResultEntry, QualifyingEntry, LapEntry, PitStopEntry, Race, Stint } from '@/types/domain'

const STALE_HISTORICAL = Infinity
const STALE_CURRENT = 1000 * 60 * 30

function staleTime(season: number) {
  return season < CURRENT_YEAR ? STALE_HISTORICAL : STALE_CURRENT
}

export function useSeasonSchedule(season: number) {
  return useQuery({
    queryKey: ['schedule', season],
    queryFn: async () => {
      const races = await getSeasonSchedule(season)
      return races.map((r): Race => ({
        season: Number(r.season),
        round: Number(r.round),
        raceName: r.raceName,
        circuitId: r.Circuit.circuitId,
        circuitName: r.Circuit.circuitName,
        location: r.Circuit.Location.locality,
        country: r.Circuit.Location.country,
        date: r.date,
        lat: Number(r.Circuit.Location.lat),
        lng: Number(r.Circuit.Location.long),
      }))
    },
    staleTime: staleTime(season),
    gcTime: 1000 * 60 * 60 * 24,
  })
}

export function useRaceResults(season: number, round: number) {
  return useQuery({
    queryKey: ['raceResults', season, round],
    queryFn: async () => {
      const race = await getRaceResults(season, round)
      if (!race) return null
      return (race.Results ?? []).map((r): RaceResultEntry => ({
        position: Number(r.position),
        driver: {
          driverId: r.Driver.driverId,
          code: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(),
          number: r.number,
          firstName: r.Driver.givenName,
          lastName: r.Driver.familyName,
          fullName: `${r.Driver.givenName} ${r.Driver.familyName}`,
          nationality: r.Driver.nationality,
          dateOfBirth: r.Driver.dateOfBirth,
        },
        constructor: {
          constructorId: r.Constructor.constructorId,
          name: r.Constructor.name,
          nationality: r.Constructor.nationality,
          color: getConstructorColor(r.Constructor.constructorId),
        },
        grid: Number(r.grid),
        laps: Number(r.laps),
        points: Number(r.points),
        status: r.status,
        time: r.Time?.time ?? null,
        fastestLap: r.FastestLap?.Time.time ?? null,
        fastestLapRank: r.FastestLap ? Number(r.FastestLap.rank) : null,
      }))
    },
    enabled: round > 0,
    staleTime: STALE_HISTORICAL,
    gcTime: 1000 * 60 * 60 * 24,
  })
}

export function useQualifyingResults(season: number, round: number) {
  return useQuery({
    queryKey: ['qualifying', season, round],
    queryFn: async () => {
      const race = await getQualifyingResults(season, round)
      if (!race) return null
      return (race.QualifyingResults ?? []).map((q): QualifyingEntry => ({
        position: Number(q.position),
        driver: {
          driverId: q.Driver.driverId,
          code: q.Driver.code ?? q.Driver.familyName.slice(0, 3).toUpperCase(),
          number: q.number,
          firstName: q.Driver.givenName,
          lastName: q.Driver.familyName,
          fullName: `${q.Driver.givenName} ${q.Driver.familyName}`,
          nationality: q.Driver.nationality,
          dateOfBirth: q.Driver.dateOfBirth,
        },
        constructor: {
          constructorId: q.Constructor.constructorId,
          name: q.Constructor.name,
          nationality: q.Constructor.nationality,
          color: getConstructorColor(q.Constructor.constructorId),
        },
        q1: q.Q1 ?? null,
        q2: q.Q2 ?? null,
        q3: q.Q3 ?? null,
      }))
    },
    enabled: round > 0,
    staleTime: STALE_HISTORICAL,
    gcTime: 1000 * 60 * 60 * 24,
  })
}

export function useLapTimes(season: number, round: number) {
  return useQuery({
    queryKey: ['laps', season, round],
    queryFn: async () => {
      const laps = await getLapTimes(season, round)
      const entries: LapEntry[] = []
      for (const lap of laps) {
        for (const timing of lap.Timings) {
          entries.push({
            lap: Number(lap.number),
            driverId: timing.driverId,
            position: Number(timing.position),
            time: timing.time,
          })
        }
      }
      return entries
    },
    enabled: round > 0,
    staleTime: STALE_HISTORICAL,
    gcTime: 1000 * 60 * 60 * 24,
  })
}

export function usePitStops(season: number, round: number) {
  return useQuery({
    queryKey: ['pitStops', season, round],
    queryFn: async () => {
      const pits = await getPitStops(season, round)
      return pits.map((p): PitStopEntry => ({
        driverId: p.driverId,
        lap: Number(p.lap),
        stop: Number(p.stop),
        duration: parseFloat(p.duration),
        time: p.time,
      }))
    },
    enabled: round > 0,
    staleTime: STALE_HISTORICAL,
    gcTime: 1000 * 60 * 60 * 24,
  })
}

export function useOpenF1Stints(season: number, circuitShortName: string) {
  return useQuery({
    queryKey: ['openf1Stints', season, circuitShortName],
    queryFn: async () => {
      if (season < 2023) return null
      const session = await getRaceSession(season, circuitShortName)
      if (!session) return null
      const stints = await getStints(session.session_key)
      return stints.map((s): Stint => ({
        driverId: String(s.driver_number),
        lapStart: s.lap_start,
        lapEnd: s.lap_end,
        compound: s.compound,
        tyrageAtStart: s.tyre_age_at_start,
      }))
    },
    enabled: !!circuitShortName,
    staleTime: STALE_HISTORICAL,
    gcTime: 1000 * 60 * 60 * 24,
  })
}

export function useOpenF1Pits(season: number, circuitShortName: string) {
  return useQuery({
    queryKey: ['openf1Pits', season, circuitShortName],
    queryFn: async () => {
      if (season < 2023) return null
      const session = await getRaceSession(season, circuitShortName)
      if (!session) return null
      return getPits(session.session_key)
    },
    enabled: !!circuitShortName,
    staleTime: STALE_HISTORICAL,
    gcTime: 1000 * 60 * 60 * 24,
  })
}

export function useAllSeasonResults(season: number) {
  return useQuery({
    queryKey: ['allResults', season],
    queryFn: () => getAllSeasonResults(season),
    staleTime: staleTime(season),
    gcTime: 1000 * 60 * 60 * 24,
  })
}

export function useAllSeasonQualifying(season: number) {
  return useQuery({
    queryKey: ['allQualifying', season],
    queryFn: () => getAllSeasonQualifying(season),
    staleTime: staleTime(season),
    gcTime: 1000 * 60 * 60 * 24,
  })
}
