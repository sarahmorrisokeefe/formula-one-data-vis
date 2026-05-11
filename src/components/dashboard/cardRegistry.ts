import type { ComponentType } from 'react'
import { DriverStandingsCard } from './cards/DriverStandingsCard'
import { ConstructorStandingsCard } from './cards/ConstructorStandingsCard'
import { TitleFightCard } from './cards/TitleFightCard'
import { RaceCalendarCard } from './cards/RaceCalendarCard'

export type CardType =
  | 'driver_standings'
  | 'constructor_standings'
  | 'title_fight'
  | 'race_calendar'

export type LayoutEntry = {
  id: string
  type: CardType
}

type CardEntry = {
  type: CardType
  label: string
  description: string
  Component: ComponentType
}

export const CARD_REGISTRY: Record<CardType, CardEntry> = {
  driver_standings: {
    type: 'driver_standings',
    label: 'Driver Standings',
    description: 'Top 5 drivers in the championship with current points and team colors.',
    Component: DriverStandingsCard,
  },
  constructor_standings: {
    type: 'constructor_standings',
    label: 'Constructor Standings',
    description: 'Top 5 constructors in the championship with points and wins.',
    Component: ConstructorStandingsCard,
  },
  title_fight: {
    type: 'title_fight',
    label: 'Title Fight',
    description: "Cumulative-points trajectory for the championship's top 3 drivers across completed rounds.",
    Component: TitleFightCard,
  },
  race_calendar: {
    type: 'race_calendar',
    label: 'Race Calendar',
    description: 'Full season schedule with the next race highlighted.',
    Component: RaceCalendarCard,
  },
}

export const DEFAULT_LAYOUT: LayoutEntry[] = [
  { id: 'default-driver-standings', type: 'driver_standings' },
  { id: 'default-constructor-standings', type: 'constructor_standings' },
  { id: 'default-title-fight', type: 'title_fight' },
  { id: 'default-race-calendar', type: 'race_calendar' },
]
