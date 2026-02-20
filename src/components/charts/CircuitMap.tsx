import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as d3 from 'd3'
import { Card } from '@/components/ui/Card'

// Maps Jolpica circuitId → bacinger/f1-circuits filename (without .geojson)
// The bacinger repo uses: {ISO_country_code}-{year_circuit_opened}
// Source: https://github.com/bacinger/f1-circuits
const CIRCUIT_ID_MAP: Record<string, string> = {
  albert_park:    'au-1953', // Melbourne, Australia
  americas:       'us-2012', // Circuit of the Americas
  bahrain:        'bh-2002',
  baku:           'az-2016',
  catalunya:      'es-1991', // Barcelona
  hungaroring:    'hu-1986',
  imola:          'it-1953', // Autodromo Enzo e Dino Ferrari
  jeddah:         'sa-2021',
  miami:          'us-2022',
  monaco:         'mc-1929',
  monza:          'it-1922',
  red_bull_ring:  'at-1969',
  rodriguez:      'mx-1962', // Autodromo Hermanos Rodriguez
  silverstone:    'gb-1948',
  singapore:      'sg-2008', // Marina Bay Street Circuit
  spa:            'be-1925', // Spa-Francorchamps
  suzuka:         'jp-1962',
  yas_marina:     'ae-2009', // Abu Dhabi
  zandvoort:      'nl-1948',
  interlagos:     'br-1977', // Sao Paulo current layout
  las_vegas:      'us-2023',
  losail:         'qa-2004',
  shanghai:       'cn-2004',
  villeneuve:     'ca-1978', // Circuit Gilles Villeneuve
  portimao:       'pt-2008',
  nurburgring:    'de-1927',
  hockenheimring: 'de-1932',
  istanbul:       'tr-2005',
  sepang:         'my-1999',
  estoril:        'pt-1972',
  kyalami:        'za-1961',
  sochi:          'ru-2014',
  buenos_aires:   'ar-1952',
}

async function fetchCircuitGeoJSON(circuitId: string) {
  const id = CIRCUIT_ID_MAP[circuitId]
  if (!id) throw new Error(`No circuit map available for "${circuitId}"`)
  const url = `https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/${id}.geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Circuit map fetch failed for "${id}" (${res.status})`)
  return res.json()
}

interface Props {
  circuitId: string
}

export function CircuitMap({ circuitId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [visible, setVisible] = useState(false)

  const query = useQuery({
    queryKey: ['circuitMap', circuitId],
    queryFn: () => fetchCircuitGeoJSON(circuitId),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  })

  // Fade out whenever circuitId changes (new data loading)
  useEffect(() => {
    setVisible(false)
  }, [circuitId])

  // Draw circuit when data arrives
  useEffect(() => {
    if (!query.data || !svgRef.current) return

    const el = svgRef.current
    const width = el.clientWidth || 600
    const height = el.clientHeight || 320

    const svg = d3.select(el)
    svg.selectAll('*').remove()

    const padding = 32
    const projection = d3.geoMercator().fitExtent(
      [[padding, padding], [width - padding, height - padding]],
      query.data
    )
    const pathGen = d3.geoPath().projection(projection)

    const features =
      query.data.type === 'FeatureCollection'
        ? query.data.features
        : [query.data]

    const g = svg.append('g')

    // Subtle glow behind track line
    g.selectAll('path.glow')
      .data(features)
      .enter()
      .append('path')
      .attr('class', 'glow')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', (d: any) => pathGen(d) ?? '')
      .attr('fill', 'none')
      .attr('stroke', '#e10600')
      .attr('stroke-width', 8)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('opacity', 0.12)

    // Main circuit line
    g.selectAll('path.track')
      .data(features)
      .enter()
      .append('path')
      .attr('class', 'track')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', (d: any) => pathGen(d) ?? '')
      .attr('fill', 'none')
      .attr('stroke', '#e10600')
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')

    // Slight delay to allow repaint before fading in
    const tid = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(tid)
  }, [query.data])

  // Silently hide if circuit isn't in the map or fetch fails
  if (query.isError) return null

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h2 className="font-semibold text-gray-900 dark:text-white">Circuit Layout</h2>
        <p className="text-xs text-gray-500 mt-0.5">Track outline</p>
      </div>
      <div className="relative h-72 px-2 pb-4">
        {query.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="block h-3 w-3 animate-spin rounded-full border-2 border-[#e10600] border-t-transparent" />
              Loading circuit map…
            </div>
          </div>
        )}
        <svg
          ref={svgRef}
          className="w-full h-full transition-opacity duration-500"
          style={{ opacity: visible ? 1 : 0 }}
        />
      </div>
    </Card>
  )
}
