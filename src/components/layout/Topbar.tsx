import { Sun, Moon, Menu, Settings2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { useSeason } from '@/context/SeasonContext'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'
import { SEASON_YEARS } from '@/constants/f1'
import { Select } from '@/components/ui/Select'

interface TopbarProps {
  onMenuToggle: () => void
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { theme, toggleTheme } = useTheme()
  const { season, setSeason } = useSeason()
  const { isEditing, setEditing } = useDashboardLayout()
  const location = useLocation()

  // The edit toggle only appears on the Dashboard route. Editing card layout
  // from any other page doesn't make sense.
  const isOnDashboard = location.pathname === '/'

  const seasonOptions = SEASON_YEARS.map(y => ({ value: y, label: String(y) }))

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white dark:border-white/[0.06] dark:bg-black/20 dark:backdrop-blur-md px-4 sm:px-5">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* F1 wordmark — mobile only, shown when sidebar is hidden */}
        <div className="flex items-center gap-1.5 md:hidden">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#e10600]">
            <span className="text-[10px] font-black text-white tracking-tight">F1</span>
          </div>
        </div>

        <Select
          label="Season"
          value={season}
          onChange={v => setSeason(Number(v))}
          options={seasonOptions}
        />
      </div>

      <div className="flex items-center gap-2">
        {isOnDashboard && (
          <button
            onClick={() => setEditing(!isEditing)}
            className={`rounded-lg p-2 transition-colors ${
              isEditing
                ? 'bg-[#e10600]/10 text-[#e10600]'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100'
            }`}
            aria-label={isEditing ? 'Done editing dashboard' : 'Edit dashboard layout'}
            aria-pressed={isEditing}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}
