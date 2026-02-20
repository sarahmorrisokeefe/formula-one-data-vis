import { createContext, useContext, useState } from 'react'
import { CURRENT_YEAR } from '@/constants/f1'

interface SeasonContextValue {
  season: number
  setSeason: (year: number) => void
}

const SeasonContext = createContext<SeasonContextValue | null>(null)

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState<number>(() => {
    const stored = localStorage.getItem('f1-season')
    const parsed = stored ? parseInt(stored, 10) : NaN
    // Before April, default to the previous year (current season hasn't started)
    const defaultSeason = new Date().getMonth() < 3 ? CURRENT_YEAR - 1 : CURRENT_YEAR
    return !isNaN(parsed) ? parsed : defaultSeason
  })

  const handleSetSeason = (year: number) => {
    setSeason(year)
    localStorage.setItem('f1-season', String(year))
  }

  return (
    <SeasonContext.Provider value={{ season, setSeason: handleSetSeason }}>
      {children}
    </SeasonContext.Provider>
  )
}

export function useSeason(): SeasonContextValue {
  const ctx = useContext(SeasonContext)
  if (!ctx) throw new Error('useSeason must be used within SeasonProvider')
  return ctx
}
