import type {
  OpenF1Session,
  OpenF1Stint,
  OpenF1Pit,
  OpenF1Driver,
} from '@/types/api'

const BASE = 'https://api.openf1.org/v1'

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OpenF1 API error: ${res.status} ${url}`)
  return res.json() as Promise<T>
}

export async function getRaceSession(
  year: number,
  circuitShortName: string
): Promise<OpenF1Session | null> {
  const data = await fetchJSON<OpenF1Session[]>(
    `${BASE}/sessions?year=${year}&circuit_short_name=${circuitShortName}&session_name=Race`
  )
  return data[0] ?? null
}

export async function getStints(sessionKey: number): Promise<OpenF1Stint[]> {
  return fetchJSON<OpenF1Stint[]>(`${BASE}/stints?session_key=${sessionKey}`)
}

export async function getPits(sessionKey: number): Promise<OpenF1Pit[]> {
  return fetchJSON<OpenF1Pit[]>(`${BASE}/pit?session_key=${sessionKey}`)
}

export async function getDriversForSession(
  sessionKey: number
): Promise<OpenF1Driver[]> {
  return fetchJSON<OpenF1Driver[]>(`${BASE}/drivers?session_key=${sessionKey}`)
}

export async function getAllSessions(year: number): Promise<OpenF1Session[]> {
  return fetchJSON<OpenF1Session[]>(
    `${BASE}/sessions?year=${year}&session_name=Race`
  )
}
