import { ChevronDown } from 'lucide-react'

interface SelectProps {
  value: string | number
  onChange: (value: string) => void
  options: { value: string | number; label: string }[]
  className?: string
  label?: string
}

export function Select({ value, onChange, options, className = '', label }: SelectProps) {
  return (
    <div className={`relative inline-flex flex-col gap-1 ${className}`}>
      {label && <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none cursor-pointer rounded-lg border border-white/10 bg-white/5 dark:bg-white/[0.05] px-3 py-2 pr-8 text-sm font-medium text-gray-100 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e10600]/50 hover:bg-white/10 transition-colors"
        >
          {options.map(opt => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-gray-900 text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
    </div>
  )
}
