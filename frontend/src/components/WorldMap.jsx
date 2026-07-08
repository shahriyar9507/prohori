import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Graticule, Sphere, Marker, Line } from 'react-simple-maps'

// Bundled locally (no CDN dependency → always renders, even air-gapped).
const GEO = `${import.meta.env.BASE_URL}world-110m.json`
const ALIAS = { 'united states': 'united states of america', usa: 'united states of america', uk: 'united kingdom' }
const DHAKA = [90.4, 23.8]
// Approx capital/centroid coords for the actors we track (lon, lat).
const COORDS = {
  india: [78.9, 22], china: [104, 35], myanmar: [96, 21], 'united states': [-98, 39],
  'european union': [10, 50], 'saudi arabia': [45, 24], 'united arab emirates': [54, 24],
  qatar: [51, 25], pakistan: [69, 30], japan: [138, 36], russia: [95, 61], malaysia: [102, 4],
  nepal: [84, 28], 'sri lanka': [80.7, 7.9], bangladesh: DHAKA,
}

// Live geopolitical footprint: choropleth of active countries + pulsing markers
// + relation arcs to Dhaka. The visual centrepiece of the DRISHTI dashboard.
export default function EventWorldMap({ events }) {
  const [tip, setTip] = useState(null)
  const counts = {}
  events.forEach((s) => (s.event.actors || []).forEach((a) => {
    let k = a.toLowerCase(); k = ALIAS[k] || k
    counts[k] = (counts[k] || 0) + 1
  }))
  const max = Math.max(1, ...Object.values(counts))
  const hitFor = (name) => {
    const n = name.toLowerCase()
    let c = 0
    for (const [k, v] of Object.entries(counts)) if (n === k || n.includes(k) || k.includes(n)) c = Math.max(c, v)
    return c
  }
  // Marker list from tracked actors that actually appear (excluding Bangladesh).
  const markers = Object.entries(counts)
    .filter(([k]) => COORDS[k] && k !== 'bangladesh')
    .map(([k, v]) => ({ name: k, coords: COORDS[k], v }))

  return (
    <div className="worldmap">
      <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 168, center: [40, 18] }} style={{ width: '100%', height: 'auto' }}>
        <Sphere stroke="var(--wm-stroke)" strokeWidth={0.5} fill="var(--wm-ocean)" />
        <Graticule stroke="var(--wm-grat)" strokeWidth={0.4} />
        <Geographies geography={GEO}>
          {({ geographies }) => geographies.map((geo) => {
            const c = hitFor(geo.properties.name)
            const t = c / max
            const fill = c ? `rgba(56,189,248,${0.3 + t * 0.6})` : 'var(--wm-land)'
            return (
              <Geography key={geo.rsmKey} geography={geo} fill={fill}
                stroke="var(--wm-stroke)" strokeWidth={0.4}
                onMouseEnter={() => c && setTip(`${geo.properties.name}: ${c} signal${c > 1 ? 's' : ''}`)}
                onMouseLeave={() => setTip(null)}
                style={{ default: { outline: 'none' }, hover: { fill: c ? '#38bdf8' : 'var(--wm-land)', outline: 'none', cursor: c ? 'pointer' : 'default' }, pressed: { outline: 'none' } }} />
            )
          })}
        </Geographies>

        {/* Relation arcs actor → Dhaka */}
        {markers.map((m) => (
          <Line key={`l-${m.name}`} from={m.coords} to={DHAKA} stroke="var(--accent)"
            strokeWidth={0.6 + (m.v / max) * 1.4} strokeOpacity={0.35} strokeLinecap="round" className="wm-arc" />
        ))}

        {/* Pulsing actor markers */}
        {markers.map((m) => {
          const r = 2.4 + (m.v / max) * 3.2
          return (
            <Marker key={`m-${m.name}`} coordinates={m.coords}
              onMouseEnter={() => setTip(`${m.name}: ${m.v} signal${m.v > 1 ? 's' : ''}`)} onMouseLeave={() => setTip(null)}>
              <circle r={r + 3} className="wm-pulse" />
              <circle r={r} className="wm-dot" />
            </Marker>
          )
        })}

        {/* Home node — Dhaka */}
        <Marker coordinates={DHAKA}>
          <circle r={5} className="wm-pulse home" />
          <circle r={3.2} className="wm-home" />
        </Marker>
      </ComposableMap>
      {tip && <div className="wm-tip">{tip}</div>}
    </div>
  )
}
