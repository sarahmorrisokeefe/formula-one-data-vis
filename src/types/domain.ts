// ─── Domain Models (transformed from API responses) ─────────────────────────

export interface Driver {
  driverId: string
  code: string
  number: string
  firstName: string
  lastName: string
  fullName: string
  nationality: string
  dateOfBirth: string
}

export interface Constructor {
  constructorId: string
  name: string
  nationality: string
  color: string
}

export interface DriverStandingEntry {
  position: number
  points: number
  wins: number
  driver: Driver
  constructor: Constructor
}

export interface ConstructorStandingEntry {
  position: number
  points: number
  wins: number
  constructor: Constructor
}

export interface SeasonStandings {
  season: number
  round: number
  driverStandings: DriverStandingEntry[]
  constructorStandings: ConstructorStandingEntry[]
}

export interface Race {
  season: number
  round: number
  raceName: string
  circuitId: string
  circuitName: string
  location: string
  country: string
  date: string
  lat: number
  lng: number
}

export interface RaceResultEntry {
  position: number
  driver: Driver
  constructor: Constructor
  grid: number
  laps: number
  points: number
  status: string
  time: string | null
  fastestLap: string | null
  fastestLapRank: number | null
}

export interface QualifyingEntry {
  position: number
  driver: Driver
  constructor: Constructor
  q1: string | null
  q2: string | null
  q3: string | null
}

export interface LapEntry {
  lap: number
  driverId: string
  position: number
  time: string
}

export interface PitStopEntry {
  driverId: string
  lap: number
  stop: number
  duration: number
  time: string
}

export interface Stint {
  driverId: string
  lapStart: number
  lapEnd: number
  compound: string
  tyrageAtStart: number
}

export interface CircuitInfo {
  circuitId: string
  circuitName: string
  location: string
  country: string
  lat: number
  lng: number
  firstGrandPrix?: number
  lapRecord?: string
  lapRecordHolder?: string
  lapRecordYear?: number
  numberOfCorners?: number
  circuitLength?: number
}

export interface StandingsOverTimePoint {
  round: number
  raceName: string
  [driverId: string]: number | string
}
