import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X } from 'lucide-react'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'
import type { LayoutEntry } from '@/components/dashboard/cardRegistry'

interface SortableCardProps {
  entry: LayoutEntry
  children: React.ReactNode
}

export function SortableCard({ entry, children }: SortableCardProps) {
  const { isEditing, removeCard } = useDashboardLayout()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id, disabled: !isEditing })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // When not editing, render the card normally with no overlay.
  if (!isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        {children}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      // The entire card body is the drag handle when editing. dnd-kit listeners
      // include onPointerDown / onKeyDown which initiate the drag gesture.
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing rounded-xl ring-2 ring-[#e10600]/30 ring-offset-2 ring-offset-transparent transition-shadow"
    >
      {children}
      <button
        type="button"
        onClick={(e) => {
          // Stop propagation so the click doesn't initiate a drag gesture.
          e.stopPropagation()
          e.preventDefault()
          removeCard(entry.id)
        }}
        // PointerDown handles desktop (PointerSensor); TouchStart handles
        // mobile (TouchSensor listens on touchstart directly, not via the
        // synthesized pointer events). Both must be stopped so a long-press
        // on the remove button doesn't initiate a drag.
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        aria-label="Remove card"
        className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/90 text-white shadow-md hover:bg-red-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
