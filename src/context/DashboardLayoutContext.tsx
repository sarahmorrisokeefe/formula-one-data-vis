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

  // Internal functional-updater helper for mutators. Each mutator passes a
  // reducer over the prev layout so two synchronous calls compose correctly
  // (e.g. removeCard(a); removeCard(b) doesn't drop the first removal).
  // localStorage write-through happens inside the setter callback against
  // the resolved next value.
  const updateLayout = (reducer: (prev: LayoutEntry[]) => LayoutEntry[]) => {
    setLayoutState((prev) => {
      const next = reducer(prev)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // See setLayout above; same rationale.
      }
      return next
    })
  }

  const addCard = (type: CardType) => {
    updateLayout((prev) =>
      // Defense in depth: if the AddCardModal ever bypasses its registry-minus-
      // layout filter (race condition, future "quick-add" affordance, etc.),
      // refuse to insert a second card of the same type.
      prev.some((e) => e.type === type)
        ? prev
        : [...prev, { id: newCardId(), type }]
    )
  }

  const removeCard = (id: string) => {
    updateLayout((prev) => prev.filter((entry) => entry.id !== id))
  }

  const reorderCards = (fromIndex: number, toIndex: number) => {
    updateLayout((prev) => {
      if (fromIndex === toIndex) return prev
      if (fromIndex < 0 || fromIndex >= prev.length) return prev
      if (toIndex < 0 || toIndex >= prev.length) return prev
      const next = prev.slice()
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
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
