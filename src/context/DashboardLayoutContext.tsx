import { createContext, useContext, useState } from 'react'
import {
  CARD_REGISTRY,
  DEFAULT_LAYOUT,
  type CardType,
  type LayoutEntry,
} from '@/components/dashboard/cardRegistry'

const STORAGE_KEY = 'f1-dashboard-layout'

interface DashboardLayoutContextValue {
  layout: LayoutEntry[]
  setLayout: (next: LayoutEntry[]) => void
  isEditing: boolean
  setEditing: (next: boolean) => void
  addCard: (type: CardType) => void
  removeCard: (id: string) => void
  reorderCards: (fromIndex: number, toIndex: number) => void
  resetToDefault: () => void
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null)

function readStoredLayout(): LayoutEntry[] {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_LAYOUT
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT
    // Validate each entry has the right shape and a known type. If anything
    // is off, fall back to default rather than render with garbage data.
    const validTypes = Object.keys(CARD_REGISTRY) as CardType[]
    const isValid = parsed.every(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        typeof e.id === 'string' &&
        typeof e.type === 'string' &&
        validTypes.includes(e.type as CardType)
    )
    if (!isValid) return DEFAULT_LAYOUT
    // Duplicate ids would produce React "same key" warnings when the layout
    // is rendered. Fall back to default if storage was hand-edited badly.
    const ids = parsed.map((e) => e.id)
    if (new Set(ids).size !== ids.length) return DEFAULT_LAYOUT
    return parsed as LayoutEntry[]
  } catch {
    return DEFAULT_LAYOUT
  }
}

// Small ID generator. crypto.randomUUID is supported in all modern browsers
// (including Safari 15.4+); fall back to a timestamp-derived string for any
// rare environment where it's missing.
function newCardId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function DashboardLayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayoutState] = useState<LayoutEntry[]>(readStoredLayout)
  const [isEditing, setEditing] = useState(false)

  const setLayout = (next: LayoutEntry[]) => {
    setLayoutState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage may be unavailable (Safari private mode, quota errors).
      // Fail silently — the in-memory state still updates, so the UI works
      // for this session. The user just loses persistence.
    }
  }

  const addCard = (type: CardType) => {
    setLayout([...layout, { id: newCardId(), type }])
  }

  const removeCard = (id: string) => {
    setLayout(layout.filter((entry) => entry.id !== id))
  }

  const reorderCards = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= layout.length) return
    if (toIndex < 0 || toIndex >= layout.length) return
    const next = layout.slice()
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setLayout(next)
  }

  const resetToDefault = () => {
    setLayout(DEFAULT_LAYOUT)
  }

  return (
    <DashboardLayoutContext.Provider
      value={{
        layout,
        setLayout,
        isEditing,
        setEditing,
        addCard,
        removeCard,
        reorderCards,
        resetToDefault,
      }}
    >
      {children}
    </DashboardLayoutContext.Provider>
  )
}

export function useDashboardLayout(): DashboardLayoutContextValue {
  const ctx = useContext(DashboardLayoutContext)
  if (!ctx) {
    throw new Error('useDashboardLayout must be used within DashboardLayoutProvider')
  }
  return ctx
}
