import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = 'Failed to load data',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <AlertCircle className="h-10 w-10 text-red-400" />
      <p className="text-sm text-gray-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  )
}
