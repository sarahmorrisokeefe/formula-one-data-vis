import { useMemo, useState } from 'react'
import * as d3 from 'd3'
import type { LapEntry, RaceResultEntry } from '@/types/domain'

interface LapPositionChartProps {
  lapTimes: LapEntry[]
  results: RaceResultEntry[]
}

export function LapPositionChart({ lapTimes, results }: LapPositionChartProps) {
  const [hoveredDriver, setHoveredDriver] = useState<string | null>(null)

  const { paths, xScale, yScale, maxLap, width, height } = useMemo(() => {
    const W = 900
    const H = 420
    const marginTop = 20
    const marginRight = 60
    const marginBottom = 30
    const marginLeft = 30

    const driverIds = results.map((r) => r.driver.driverId)
    const colorMap = new Map(
      results.map((r) => [r.driver.driverId, r.constructor.color])
    )
    const driverCodeMap = new Map(
      results.map((r) => [r.driver.driverId, r.driver.code])
    )

    // Group lap times by driverId
    const byDriver = new Map<string, LapEntry[]>()
    for (const lap of lapTimes) {
      if (!byDriver.has(lap.driverId)) byDriver.set(lap.driverId, [])
      byDriver.get(lap.driverId)!.push(lap)
    }

    const maxLap = Math.max(...lapTimes.map((l) => l.lap), 0)
    const numDrivers = driverIds.length

    const xScale = d3
      .scaleLinear()
      .domain([1, maxLap])
      .range([marginLeft, W - marginRight])

    const yScale = d3
      .scaleLinear()
      .domain([1, numDrivers])
      .range([marginTop, H - marginBottom])

    // Build path data
    const paths: { driverId: string; code: string; color: string; d: string; lastPos: number }[] = []

    for (const driverId of driverIds) {
      const laps = byDriver.get(driverId)
      if (!laps || laps.length === 0) continue

      const sorted = [...laps].sort((a, b) => a.lap - b.lap)
      const line = d3
        .line<LapEntry>()
        .x((l) => xScale(l.lap))
        .y((l) => yScale(l.position))
        .curve(d3.curveMonotoneX)

      const dPath = line(sorted)
      if (!dPath) continue

      const lastLap = sorted[sorted.length - 1]

      paths.push({
        driverId,
        code: driverCodeMap.get(driverId) ?? driverId,
        color: colorMap.get(driverId) ?? '#888',
        d: dPath,
        lastPos: lastLap.position,
      })
    }

    return { paths, xScale, yScale, maxLap, width: W, height: H }
  }, [lapTimes, results])

  const tickValues = useMemo(() => {
    const step = Math.ceil(maxLap / 10)
    return Array.from({ length: Math.ceil(maxLap / step) }, (_, i) => (i + 1) * step).filter(v => v <= maxLap)
  }, [maxLap])

  return (
    <div className="overflow-x-auto px-4 pb-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: '500px' }}
      >
        {/* Grid lines */}
        {tickValues.map((lap) => (
          <line
            key={lap}
            x1={xScale(lap)}
            x2={xScale(lap)}
            y1={20}
            y2={height - 30}
            stroke="#ffffff08"
            strokeDasharray="4 2"
          />
        ))}

        {/* Position lines (horizontal faint) */}
        {Array.from({ length: results.length }, (_, i) => i + 1).map((pos) => (
          <line
            key={pos}
            x1={30}
            x2={width - 60}
            y1={yScale(pos)}
            y2={yScale(pos)}
            stroke="#ffffff05"
          />
        ))}

        {/* Driver paths */}
        {paths.map(({ driverId, d, color }) => (
          <path
            key={driverId}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={hoveredDriver === null ? 1.5 : hoveredDriver === driverId ? 3 : 0.4}
            strokeOpacity={hoveredDriver === null ? 0.85 : hoveredDriver === driverId ? 1 : 0.2}
            style={{ transition: 'stroke-width 150ms, stroke-opacity 150ms' }}
            onMouseEnter={() => setHoveredDriver(driverId)}
            onMouseLeave={() => setHoveredDriver(null)}
          />
        ))}

        {/* End labels */}
        {paths
          .sort((a, b) => a.lastPos - b.lastPos)
          .slice(0, 10)
          .map(({ driverId, code, color, lastPos }) => (
            <text
              key={driverId}
              x={width - 55}
              y={yScale(lastPos) + 4}
              fill={color}
              fontSize={9}
              fontWeight={hoveredDriver === driverId ? 700 : 400}
              opacity={hoveredDriver === null ? 0.8 : hoveredDriver === driverId ? 1 : 0.3}
            >
              {code}
            </text>
          ))}

        {/* X axis ticks */}
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

        {/* Y axis labels */}
        {[1, 5, 10, 15, 20].filter((p) => p <= results.length).map((pos) => (
          <text
            key={pos}
            x={20}
            y={yScale(pos) + 4}
            textAnchor="middle"
            fill="#6b7280"
            fontSize={9}
          >
            P{pos}
          </text>
        ))}
      </svg>
    </div>
  )
}
