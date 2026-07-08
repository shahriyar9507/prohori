import { useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

const GEO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
// Actor names in the feed → how they appear in the world topojson.
const ALIAS = { 'united states': 'united states of america', usa: 'united states of america', uk: 'united kingdom' }

// Choropleth of the countries appearing in DRISHTI events (relevance hotspots).
export default function EventWorldMap({ events }) {
  const [tip, setTip] = useState(null)
  const counts = {}
  events.forEach((s) => (s.event.actors || []).forEach((a) => {
    let k = a.toLowerCase()
    k = ALIAS[k] || k
    counts[k] = (counts[k] || 0) + 1
  }))
  const max = Math.max(1, ...Object.values(counts))
  const hitFor = (name) => {
    const n = name.toLowerCase()
    let c = 0
    for (const [k, v] of Object.entries(counts)) if (n === k || n.includes(k) || k.includes(n)) c = Math.max(c, v)
    return c
  }

  return (
    <div className="worldmap">
      <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 155, center: [30, 20] }} style={{ width: '100%', height: 'auto' }}>
        <Geographies geography={GEO}>
          {({ geographies }) => geographies.map((geo) => {
            const c = hitFor(geo.properties.name)
            const t = c / max
            const fill = c ? `rgba(56,189,248,${0.28 + t * 0.62})` : 'var(--wm-land)'
            return (
              <Geography key={geo.rsmKey} geography={geo} fill={fill}
                stroke="var(--wm-stroke)" strokeWidth={0.4}
                onMouseEnter={() => c && setTip(`${geo.properties.name}: ${c} event${c > 1 ? 's' : ''}`)}
                onMouseLeave={() => setTip(null)}
                style={{ default: { outline: 'none' }, hover: { fill: c ? '#38bdf8' : 'var(--wm-land)', outline: 'none', cursor: c ? 'pointer' : 'default' }, pressed: { outline: 'none' } }} />
            )
          })}
        </Geographies>
      </ComposableMap>
      {tip && <div className="wm-tip">{tip}</div>}
    </div>
  )
}
