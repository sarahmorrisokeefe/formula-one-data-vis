// ─── Jolpica / Ergast API Response Types ────────────────────────────────────

export interface JolpicaResponse<T> {
  MRData: {
    xmlns: string
    series: string
    url: string
    limit: string
    offset: string
    total: string
  } & T
}

export interface SeasonTable {
  SeasonTable: {
    season: string
    Races: JolpicaRace[]
  }
}

export interface StandingsTable {
  StandingsTable: {
    season: string
    round?: string
    StandingsLists: StandingsList[]
  }
}

export interface StandingsList {
  season: string
  round: string
  DriverStandings?: DriverStanding[]
  ConstructorStandings?: ConstructorStanding[]
}

export interface DriverStanding {
  position: string
  positionText: string
  points: string
  wins: string
  Driver: JolpicaDriver
  Constructors: JolpicaConstructor[]
}

export interface ConstructorStanding {
  position: string
  positionText: string
  points: string
  wins: string
  Constructor: JolpicaConstructor
}

export interface JolpicaDriver {
  driverId: string
  permanentNumber?: string
  code?: string
  url: string
  givenName: string
  familyName: string
  dateOfBirth: string
  nationality: string
}

export interface JolpicaConstructor {
  constructorId: string
  url: string
  name: string
  nationality: string
}

export interface JolpicaRace {
  season: string
  round: string
  url: string
  raceName: string
  Circuit: JolpicaCircuit
  date: string
  time?: string
  Results?: RaceResult[]
  QualifyingResults?: QualifyingResult[]
  Laps?: LapData[]
  PitStops?: PitStop[]
  SprintResults?: RaceResult[]
}

export interface JolpicaCircuit {
  circuitId: string
  url: string
  circuitName: string
  Location: {
    lat: string
    long: string
    locality: string
    country: string
  }
}

export interface RaceResult {
  number: string
  position: string
  positionText: string
  points: string
  Driver: JolpicaDriver
  Constructor: JolpicaConstructor
  grid: string
  laps: string
  status: string
  Time?: { millis: string; time: string }
  FastestLap?: {
    rank: string
    lap: string
    Time: { time: string }
    AverageSpeed: { units: string; speed: string }
  }
}

export interface QualifyingResult {
  number: string
  position: string
  Driver: JolpicaDriver
  Constructor: JolpicaConstructor
  Q1?: string
  Q2?: string
  Q3?: string
}

export interface LapData {
  number: string
  Timings: LapTiming[]
}

export interface LapTiming {
  driverId: string
  position: string
  time: string
}

export interface PitStop {
  driverId: string
  lap: string
  stop: string
  time: string
  duration: string
}

export interface RaceTable {
  RaceTable: {
    season: string
    round?: string
    Races: JolpicaRace[]
  }
}

export interface DriverTable {
  DriverTable: {
    driverId: string
    Drivers: JolpicaDriver[]
  }
}

export interface CircuitTable {
  CircuitTable: {
    season?: string
    Circuits: JolpicaCircuit[]
  }
}

// ─── OpenF1 API Types ────────────────────────────────────────────────────────

export interface OpenF1Session {
  session_key: number
  session_name: string
  session_type: string
  status: string
  gmt_offset: string
  location: string
  country_key: number
  country_code: string
  country_name: string
  circuit_key: number
  circuit_short_name: string
  date_start: string
  date_end: string
  year: number
  meeting_key: number
}

export interface OpenF1Stint {
  session_key: number
  meeting_key: number
  stint_number: number
  driver_number: number
  lap_start: number
  lap_end: number
  compound: string
  tyre_age_at_start: number
}

export interface OpenF1Pit {
  session_key: number
  meeting_key: number
  driver_number: number
  lap_number: number
  date: string
  pit_duration: number
}

export interface OpenF1Lap {
  session_key: number
  meeting_key: number
  driver_number: number
  lap_number: number
  date_start: string
  lap_duration: number | null
  duration_sector_1: number | null
  duration_sector_2: number | null
  duration_sector_3: number | null
  i1_speed: number | null
  i2_speed: number | null
  st_speed: number | null
  is_pit_out_lap: boolean
  segments_sector_1?: number[]
  segments_sector_2?: number[]
  segments_sector_3?: number[]
}

export interface OpenF1Driver {
  session_key: number
  meeting_key: number
  driver_number: number
  broadcast_name: string
  full_name: string
  name_acronym: string
  team_name: string
  team_colour: string
  first_name: string
  last_name: string
  headshot_url: string | null
  country_code: string
}
