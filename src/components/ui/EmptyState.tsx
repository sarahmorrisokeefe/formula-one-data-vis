import { type LucideIcon } from 'lucide-react'
import { BarChart2 } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  description?: string
  icon?: LucideIcon
}

export function EmptyState({
  message = 'No data available',
  description,
  icon: Icon = BarChart2,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Icon className="h-10 w-10 text-gray-500" />
      <p className="text-sm font-medium text-gray-400">{message}</p>
      {description && (
        <p className="text-xs text-gray-500 max-w-xs">{description}</p>
      )}
    </div>
  )
}
