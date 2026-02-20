interface BadgeProps {
  label: string
  color?: string
  size?: 'sm' | 'md'
}

export function Badge({ label, color = '#888', size = 'md' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded font-semibold ${size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'}`}
      style={{
        backgroundColor: `${color}22`,
        color: color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  )
}

export function ConstructorBadge({
  name,
  color,
}: {
  name: string
  color: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-1 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-gray-400 dark:text-gray-300">{name}</span>
    </span>
  )
}
