interface SkeletonProps {
  className?: string
  variant?: 'text' | 'chart' | 'card'
  height?: number
}

export function Skeleton({ className = '', variant = 'text', height }: SkeletonProps) {
  if (variant === 'chart') {
    return (
      <div
        className={`animate-pulse rounded-lg bg-white/5 dark:bg-white/[0.03] ${className}`}
        style={{ height: height ?? 300 }}
      />
    )
  }
  if (variant === 'card') {
    return (
      <div className={`animate-pulse rounded-xl bg-white/5 dark:bg-white/[0.03] p-4 ${className}`}>
        <div className="h-4 w-1/3 rounded bg-white/10 mb-3" />
        <div className="h-3 w-2/3 rounded bg-white/10 mb-2" />
        <div className="h-3 w-1/2 rounded bg-white/10" />
      </div>
    )
  }
  return (
    <div
      className={`animate-pulse rounded bg-white/10 dark:bg-white/[0.06] ${className}`}
      style={{ height: height ?? 16 }}
    />
  )
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="h-8 w-8 rounded bg-white/10" />
          <div className="h-8 flex-1 rounded bg-white/10" />
          <div className="h-8 w-24 rounded bg-white/10" />
          <div className="h-8 w-16 rounded bg-white/10" />
        </div>
      ))}
    </div>
  )
}
