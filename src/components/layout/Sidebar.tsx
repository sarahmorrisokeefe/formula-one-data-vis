import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Trophy,
  Building2,
  Flag,
  User,
  MapPin,
  BarChart2,
  GitCompare,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/championship/drivers', label: 'Drivers', icon: Trophy },
  { to: '/championship/constructors', label: 'Constructors', icon: Building2 },
  { to: '/races', label: 'Race Center', icon: Flag },
  { to: '/drivers', label: 'Driver Profiles', icon: User },
  { to: '/circuits', label: 'Circuits', icon: MapPin },
  { to: '/analysis', label: 'Analysis', icon: BarChart2 },
  { to: '/compare', label: 'Head-to-Head', icon: GitCompare },
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-white/[0.06] bg-black/30 backdrop-blur-md">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/[0.06]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e10600]">
          <span className="text-xs font-black text-white tracking-tight">F1</span>
        </div>
        <span className="text-sm font-bold text-white tracking-tight">Dashboard</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#e10600]/15 text-[#ff3527] dark:text-[#ff6b63]'
                  : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-100'
              }`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] px-4 py-3">
        <p className="text-xs text-gray-600">
          Data: Jolpica F1 · OpenF1
        </p>
      </div>
    </aside>
  )
}
