import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({ children, className = '', padding = 'md', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 dark:bg-white/[0.03] backdrop-blur-sm ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
