import { useState } from 'react'
import { Plus, RotateCcw, Check } from 'lucide-react'
import { useDashboardLayout } from '@/context/DashboardLayoutContext'
import { AddCardModal } from './AddCardModal'

export function DashboardEditToolbar() {
  const { setEditing, resetToDefault } = useDashboardLayout()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e10600]/30 bg-[#e10600]/[0.04] px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#e10600] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#c40500] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add card
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset dashboard to default layout?')) {
                resetToDefault()
              }
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to default
          </button>
        </div>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-100 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          Done
        </button>
      </div>
      <AddCardModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  )
}
