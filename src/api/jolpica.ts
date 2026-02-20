import type {
  JolpicaResponse,
  SeasonTable,
  StandingsTable,
  RaceTable,
  CircuitTable,
} from '@/types/api'

const BASE = 'https://api.jolpi.ca/ergast/f1'

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Jolpica API error: ${res.status} ${url}`)
  return res.json() as Promise<T>
}

export async function getSeasonSchedule(season: number) {
  const data = await fetchJSON<JolpicaResponse<SeasonTable>>(
    `${BASE}/${season}.json?limit=30`
  )
  return data.MRData.SeasonTable.Races
}

export async function getDriverStandings(season: number, round?: number) {
  const path = round != null ? `${season}/${round}` : `${season}`
  const data = await fetchJSON<JolpicaResponse<StandingsTable>>(
    `${BASE}/${path}/driverStandings.json`
  )
  const list = data.MRData.StandingsTable.StandingsLists[0]
  return {
    round: Number(list?.round ?? round ?? 0),
    standings: list?.DriverStandings ?? [],
  }
}

export async function getConstructorStandings(season: number, round?: number) {
  const path = round != null ? `${season}/${round}` : `${season}`
  const data = await fetchJSON<JolpicaResponse<StandingsTable>>(
    `${BASE}/${path}/constructorStandings.json`
  )
  const list = data.MRData.StandingsTable.StandingsLists[0]
  return {
    round: Number(list?.round ?? round ?? 0),
    standings: list?.ConstructorStandings ?? [],
  }
}

export async function getRaceResults(season: number, round: number) {
  const data = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/${season}/${round}/results.json?limit=30`
  )
  return data.MRData.RaceTable.Races[0] ?? null
}

export async function getQualifyingResults(season: number, round: number) {
  const data = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/${season}/${round}/qualifying.json?limit=30`
  )
  return data.MRData.RaceTable.Races[0] ?? null
}

export async function getLapTimes(season: number, round: number) {
  // Fetch all laps, paginating if needed
  const firstPage = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/${season}/${round}/laps.json?limit=100&offset=0`
  )
  const total = Number(firstPage.MRData.total)
  const laps = [...(firstPage.MRData.RaceTable.Races[0]?.Laps ?? [])]

  if (total > 100) {
    const pages = Math.ceil((total - 100) / 100)
    const fetches = Array.from({ length: pages }, (_, i) =>
      fetchJSON<JolpicaResponse<RaceTable>>(
        `${BASE}/${season}/${round}/laps.json?limit=100&offset=${(i + 1) * 100}`
      ).then(d => d.MRData.RaceTable.Races[0]?.Laps ?? [])
    )
    const rest = await Promise.all(fetches)
    laps.push(...rest.flat())
  }

  return laps
}

export async function getPitStops(season: number, round: number) {
  const data = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/${season}/${round}/pitstops.json?limit=100`
  )
  return data.MRData.RaceTable.Races[0]?.PitStops ?? []
}

export async function getAllSeasonResults(season: number) {
  const first = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/${season}/results.json?limit=100&offset=0`
  )
  const total = Number(first.MRData.total)
  const races = [...first.MRData.RaceTable.Races]

  if (total > 100) {
    const pages = Math.ceil((total - 100) / 100)
    const fetches = Array.from({ length: pages }, (_, i) =>
      fetchJSON<JolpicaResponse<RaceTable>>(
        `${BASE}/${season}/results.json?limit=100&offset=${(i + 1) * 100}`
      ).then(d => d.MRData.RaceTable.Races)
    )
    const rest = await Promise.all(fetches)
    races.push(...rest.flat())
  }

  return races
}

export async function getAllSeasonQualifying(season: number) {
  const first = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/${season}/qualifying.json?limit=100&offset=0`
  )
  const total = Number(first.MRData.total)
  const races = [...first.MRData.RaceTable.Races]

  if (total > 100) {
    const pages = Math.ceil((total - 100) / 100)
    const fetches = Array.from({ length: pages }, (_, i) =>
      fetchJSON<JolpicaResponse<RaceTable>>(
        `${BASE}/${season}/qualifying.json?limit=100&offset=${(i + 1) * 100}`
      ).then(d => d.MRData.RaceTable.Races)
    )
    const rest = await Promise.all(fetches)
    races.push(...rest.flat())
  }

  return races
}

export async function getDriverCareerResults(driverId: string) {
  const first = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/drivers/${driverId}/results.json?limit=100&offset=0`
  )
  const total = Number(first.MRData.total)
  const races = [...first.MRData.RaceTable.Races]

  if (total > 100) {
    const pages = Math.ceil((total - 100) / 100)
    const fetches = Array.from({ length: pages }, (_, i) =>
      fetchJSON<JolpicaResponse<RaceTable>>(
        `${BASE}/drivers/${driverId}/results.json?limit=100&offset=${(i + 1) * 100}`
      ).then(d => d.MRData.RaceTable.Races)
    )
    const rest = await Promise.all(fetches)
    races.push(...rest.flat())
  }

  return races
}

export async function getDriverSeasonResults(season: number, driverId: string) {
  const data = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/${season}/drivers/${driverId}/results.json?limit=30`
  )
  return data.MRData.RaceTable.Races
}

export async function getDriverSeasonQualifying(season: number, driverId: string) {
  const data = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/${season}/drivers/${driverId}/qualifying.json?limit=30`
  )
  return data.MRData.RaceTable.Races
}

export async function getCircuits(season?: number) {
  const path = season != null ? `${season}/circuits` : 'circuits'
  const first = await fetchJSON<JolpicaResponse<CircuitTable>>(
    `${BASE}/${path}.json?limit=100&offset=0`
  )
  const total = Number(first.MRData.total)
  const circuits = [...first.MRData.CircuitTable.Circuits]

  if (total > 100) {
    const pages = Math.ceil((total - 100) / 100)
    const fetches = Array.from({ length: pages }, (_, i) =>
      fetchJSON<JolpicaResponse<CircuitTable>>(
        `${BASE}/${path}.json?limit=100&offset=${(i + 1) * 100}`
      ).then(d => d.MRData.CircuitTable.Circuits)
    )
    const rest = await Promise.all(fetches)
    circuits.push(...rest.flat())
  }

  return circuits
}

export async function getCircuitRaces(circuitId: string) {
  const first = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/circuits/${circuitId}/results.json?limit=1&offset=0`
  )
  const total = Number(first.MRData.total)
  // Fetch all with limit=100
  const pages = Math.ceil(total / 100)
  const fetches = Array.from({ length: pages }, (_, i) =>
    fetchJSON<JolpicaResponse<RaceTable>>(
      `${BASE}/circuits/${circuitId}/results.json?limit=100&offset=${i * 100}`
    ).then(d => d.MRData.RaceTable.Races)
  )
  const all = await Promise.all(fetches)
  return all.flat()
}

export async function getSeasonDriverList(season: number) {
  const data = await fetchJSON<JolpicaResponse<RaceTable>>(
    `${BASE}/${season}/drivers.json?limit=40`
  )
  // Drivers endpoint returns DriverTable, but we type it loosely here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.MRData as any).DriverTable?.Drivers ?? []
}
