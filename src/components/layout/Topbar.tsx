import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useSeason } from '@/context/SeasonContext'
import { SEASON_YEARS } from '@/constants/f1'
import { Select } from '@/components/ui/Select'

export function Topbar() {
  const { theme, toggleTheme } = useTheme()
  const { season, setSeason } = useSeason()

  const seasonOptions = SEASON_YEARS.map(y => ({ value: y, label: String(y) }))

  return (
    <header className="flex h-14 items-center justify-between border-b border-white/[0.06] bg-black/20 backdrop-blur-md px-5">
      <div className="flex items-center gap-2">
        <Select
          label="Season"
          value={season}
          onChange={v => setSeason(Number(v))}
          options={seasonOptions}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.08] hover:text-gray-100 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}
