import { useState } from 'react'

interface HeatmapCell {
  round: number
  position: number | null
}

interface DriverHeatmapRow {
  driverId: string
  code: string
  color: string
  results: HeatmapCell[]
}

interface DriverHeatmapProps {
  data: DriverHeatmapRow[]
  rounds: number[]
}

function positionToColor(position: number | null): string {
  if (position === null) return '#2a1a1a'
  if (position === 1) return '#e10600'
  if (position <= 3) return '#ff6b63'
  if (position <= 6) return '#ff9f66'
  if (position <= 10) return '#ffcc66'
  if (position <= 15) return '#6b7280'
  return '#374151'
}

export function DriverHeatmap({ data, rounds }: DriverHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; driver: string; round: number; position: number | null } | null>(null)

  const cellWidth = Math.max(20, Math.min(32, 800 / Math.max(rounds.length, 1)))
  const cellHeight = 26
  const labelWidth = 46
  const padding = 4
  const marginTop = 24

  const width = labelWidth + rounds.length * (cellWidth + padding) + 20
  const height = marginTop + data.length * (cellHeight + padding) + 20

  return (
    <div className="overflow-x-auto px-4 pb-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: `${Math.min(width, 900)}px` }}
      >
        {/* Round labels */}
        {rounds.map((round, i) => (
          <text
            key={round}
            x={labelWidth + i * (cellWidth + padding) + cellWidth / 2}
            y={14}
            textAnchor="middle"
            fill="#6b7280"
            fontSize={9}
          >
            R{round}
          </text>
        ))}

        {data.map((driver, ri) => (
          <g key={driver.driverId}>
            {/* Driver label */}
            <text
              x={labelWidth - 4}
              y={marginTop + ri * (cellHeight + padding) + cellHeight / 2 + 4}
              textAnchor="end"
              fill={driver.color}
              fontSize={10}
              fontWeight={500}
            >
              {driver.code}
            </text>

            {/* Cells */}
            {driver.results.map((cell, ci) => {
              const x = labelWidth + ci * (cellWidth + padding)
              const y = marginTop + ri * (cellHeight + padding)
              const color = positionToColor(cell.position)

              return (
                <g key={cell.round}>
                  <rect
                    x={x}
                    y={y}
                    width={cellWidth}
                    height={cellHeight}
                    rx={3}
                    fill={color}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = (e.target as SVGRectElement).getBoundingClientRect()
                      setTooltip({
                        x: rect.x,
                        y: rect.y,
                        driver: driver.code,
                        round: cell.round,
                        position: cell.position,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  {cell.position !== null && cellWidth >= 22 && (
                    <text
                      x={x + cellWidth / 2}
                      y={y + cellHeight / 2 + 4}
                      textAnchor="middle"
                      fill={cell.position <= 10 ? '#ffffff' : '#9ca3af'}
                      fontSize={9}
                      fontWeight={cell.position === 1 ? 700 : 400}
                      pointerEvents="none"
                    >
                      {cell.position}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs shadow-xl pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 40 }}
        >
          <p className="font-bold text-white">{tooltip.driver}</p>
          <p className="text-gray-400">Round {tooltip.round}</p>
          <p className="text-gray-300">
            {tooltip.position !== null ? `P${tooltip.position}` : 'DNF/DNS'}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap px-0">
        {[
          { pos: 1, label: 'P1' },
          { pos: 3, label: 'P2-3' },
          { pos: 6, label: 'P4-6' },
          { pos: 10, label: 'P7-10' },
          { pos: 15, label: 'P11-15' },
          { pos: 20, label: 'P16+' },
          { pos: null, label: 'DNF' },
        ].map(({ pos, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-5 rounded-sm"
              style={{ backgroundColor: positionToColor(pos) }}
            />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
