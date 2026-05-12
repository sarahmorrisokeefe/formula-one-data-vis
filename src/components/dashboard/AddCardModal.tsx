import { useEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import {
  CARD_REGISTRY,
  type CardType,
} from '@/components/dashboard/cardRegistry'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'

interface AddCardModalProps {
  open: boolean
  onClose: () => void
}

export function AddCardModal({ open, onClose }: AddCardModalProps) {
  const { layout, addCard } = useDashboardLayout()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Available cards = registry types not currently in the layout.
  const usedTypes = new Set(layout.map((e) => e.type))
  const availableTypes = (Object.keys(CARD_REGISTRY) as CardType[]).filter(
    (t) => !usedTypes.has(t)
  )

  // Close on Escape + focus management. aria-modal="true" claims focus is
  // contained in the dialog; meeting that claim minimally means moving focus
  // INTO the dialog on open and restoring it on close. Full focus-trap is
  // overkill for an MVP; this satisfies screen readers and keyboard users.
  useEffect(() => {
    if (!open) return
    // Remember the element that was focused before the modal opened so we
    // can return focus there when the modal closes.
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    // Move focus to the close button so keyboard users land somewhere sensible.
    closeButtonRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // On close: restore focus to whatever opened the modal (e.g., the
      // "Add card" button in the edit toolbar).
      previouslyFocusedRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add card"
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/[0.08] dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-white/[0.06]">
          <h2 className="font-semibold text-gray-900 dark:text-white">Add a card</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/[0.08] dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          {availableTypes.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">
              All cards are already on your dashboard.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {availableTypes.map((type) => {
                const entry = CARD_REGISTRY[type]
                return (
                  <li key={type}>
                    <button
                      type="button"
                      onClick={() => {
                        addCard(type)
                        onClose()
                      }}
                      className="group flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#e10600]/10 text-[#e10600] group-hover:bg-[#e10600] group-hover:text-white transition-colors">
                        <Plus className="h-4 w-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                          {entry.label}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {entry.description}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
