import { useMemo } from 'react'
import * as d3 from 'd3'
import { getTireColor } from '@/constants/f1'
import type { PitStopEntry, RaceResultEntry } from '@/types/domain'

interface TireStrategyChartProps {
  pitStops: PitStopEntry[]
  results: RaceResultEntry[]
  totalLaps: number
}

const TIRE_LEGEND = [
  { compound: 'SOFT', label: 'Soft' },
  { compound: 'MEDIUM', label: 'Med' },
  { compound: 'HARD', label: 'Hard' },
  { compound: 'INTERMEDIATE', label: 'Inter' },
  { compound: 'WET', label: 'Wet' },
]

export function TireStrategyChart({ pitStops, results, totalLaps }: TireStrategyChartProps) {
  const { stints, xScale, rowHeight, width, height } = useMemo(() => {
    const W = 900
    const rowH = 24
    const marginLeft = 50
    const marginRight = 20
    const marginTop = 10
    const marginBottom = 30
    const H = marginTop + results.length * rowH + marginBottom

    const xScale = d3
      .scaleLinear()
      .domain([1, totalLaps])
      .range([marginLeft, W - marginRight])

    // Build stints per driver from pit stops
    const stintsByDriver = new Map<string, { lapStart: number; lapEnd: number; stopNum: number }[]>()

    for (const r of results) {
      const driverPits = pitStops
        .filter((p) => p.driverId === r.driver.driverId)
        .sort((a, b) => a.lap - b.lap)

      const stintList: { lapStart: number; lapEnd: number; stopNum: number }[] = []
      let lastLap = 1
      for (let i = 0; i < driverPits.length; i++) {
        stintList.push({ lapStart: lastLap, lapEnd: driverPits[i].lap - 1, stopNum: i })
        lastLap = driverPits[i].lap
      }
      stintList.push({ lapStart: lastLap, lapEnd: r.laps, stopNum: driverPits.length })
      stintsByDriver.set(r.driver.driverId, stintList)
    }

    return {
      stints: stintsByDriver,
      xScale,
      rowHeight: rowH,
      width: W,
      height: H,
      marginLeft,
      marginTop,
    }
  }, [pitStops, results, totalLaps])

  const tickValues = useMemo(() => {
    const step = Math.ceil(totalLaps / 12)
    return Array.from(
      { length: Math.ceil(totalLaps / step) },
      (_, i) => (i + 1) * step
    ).filter((v) => v <= totalLaps)
  }, [totalLaps])

  // Simple compound guesser based on stint number (realistic defaults)
  function guessCompound(stintIndex: number, total: number): string {
    if (total === 1) return 'MEDIUM'
    if (stintIndex === 0) return 'SOFT'
    if (stintIndex === total - 1) return 'HARD'
    return 'MEDIUM'
  }

  const marginTop2 = 10
  const marginLeft = 50

  return (
    <div className="overflow-x-auto px-4 pb-4">
      {/* Legend */}
      <div className="flex gap-4 px-0 py-2 flex-wrap">
        {TIRE_LEGEND.map(({ compound, label }) => (
          <div key={compound} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-5 rounded-sm"
              style={{ backgroundColor: getTireColor(compound) }}
            />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
        <span className="text-xs text-gray-600 ml-2">
          (compounds estimated from pit stop data when telemetry unavailable)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: '500px' }}
      >
        {/* Tick lines */}
        {tickValues.map((lap) => (
          <line
            key={lap}
            x1={xScale(lap)}
            x2={xScale(lap)}
            y1={marginTop2}
            y2={height - 30}
            stroke="#ffffff08"
            strokeDasharray="4 2"
          />
        ))}

        {results.map((r, i) => {
          const y = marginTop2 + i * rowHeight
          const driverStints = stints.get(r.driver.driverId) ?? [
            { lapStart: 1, lapEnd: r.laps, stopNum: 0 },
          ]

          return (
            <g key={r.driver.driverId}>
              {/* Driver label */}
              <text
                x={marginLeft - 4}
                y={y + rowHeight / 2 + 4}
                textAnchor="end"
                fill={r.constructor.color}
                fontSize={10}
                fontWeight={500}
              >
                {r.driver.code}
              </text>

              {/* Stint bars */}
              {driverStints.map((stint, si) => {
                const x1 = xScale(stint.lapStart)
                const x2 = xScale(Math.min(stint.lapEnd, totalLaps))
                const compound = guessCompound(si, driverStints.length)
                const color = getTireColor(compound)
                return (
                  <g key={si}>
                    <rect
                      x={x1 + 1}
                      y={y + 3}
                      width={Math.max(2, x2 - x1 - 1)}
                      height={rowHeight - 6}
                      rx={2}
                      fill={color}
                      fillOpacity={0.85}
                    />
                    {/* Pit stop marker */}
                    {si > 0 && (
                      <line
                        x1={x1}
                        x2={x1}
                        y1={y}
                        y2={y + rowHeight}
                        stroke="#ffffff60"
                        strokeWidth={1.5}
                      />
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* X axis */}
        {tickValues.map((lap) => (
          <text
            key={lap}
            x={xScale(lap)}
            y={height - 10}
            textAnchor="middle"
            fill="#6b7280"
            fontSize={9}
          >
            L{lap}
          </text>
        ))}
      </svg>
    </div>
  )
}
