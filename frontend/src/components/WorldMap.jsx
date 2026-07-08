import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Graticule, Sphere, Marker, Line, ZoomableGroup } from 'react-simple-maps'
import { Plus, Minus, Maximize2 } from 'lucide-react'

// Bundled locally (no CDN dependency → always renders, even air-gapped).
const GEO = `${import.meta.env.BASE_URL}world-110m.json`
const ALIAS = { 'united states': 'united states of america', usa: 'united states of america', uk: 'united kingdom' }
const DHAKA = [90.4, 23.8]
const COORDS = {
  india: [78.9, 22], china: [104, 35], myanmar: [96, 21], 'united states': [-98, 39],
  'european union': [10, 50], 'saudi arabia': [45, 24], 'united arab emirates': [54, 24],
  qatar: [51, 25], pakistan: [69, 30], japan: [138, 36], russia: [95, 61], malaysia: [102, 4],
  nepal: [84, 28], 'sri lanka': [80.7, 7.9], bangladesh: DHAKA,
}
const CENTER0 = [40, 18], ZOOM0 = 1

// Live geopolitical footprint — zoomable, pannable, clickable choropleth of the
// countries in the feed, with pulsing markers + relation arcs to Dhaka.
export default function EventWorldMap({ events, onSelectCountry, selectedCountry }) {
  const [tip, setTip] = useState(null)
  const [pos, setPos] = useState({ coordinates: CENTER0, zoom: ZOOM0 })

  const counts = {}
  events.forEach((s) => (s.event.actors || []).forEach((a) => {
    let k = a.toLowerCase(); k = ALIAS[k] || k
    counts[k] = (counts[k] || 0) + 1
  }))
  const max = Math.max(1, ...Object.values(counts))
  // Resolve a topojson country name → the actor key + its live signal count.
  const resolve = (name) => {
    const n = name.toLowerCase()
    let hit = null, c = 0
    for (const [k, v] of Object.entries(counts)) if (n === k || n.includes(k) || k.includes(n)) { if (v >= c) { c = v; hit = k } }
    return { key: hit, count: c }
  }
  const markers = Object.entries(counts)
    .filter(([k]) => COORDS[k] && k !== 'bangladesh')
    .map(([k, v]) => ({ name: k, coords: COORDS[k], v }))

  const zTo = (z) => setPos((p) => ({ ...p, zoom: Math.max(1, Math.min(6, z)) }))

  return (
    <div className="worldmap">
      <div className="wm-ctrls">
        <button onClick={() => zTo(pos.zoom * 1.5)} title="Zoom in"><Plus size={16} /></button>
        <button onClick={() => zTo(pos.zoom / 1.5)} title="Zoom out"><Minus size={16} /></button>
        <button onClick={() => setPos({ coordinates: CENTER0, zoom: ZOOM0 })} title="Reset"><Maximize2 size={15} /></button>
      </div>
      <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 168 }} style={{ width: '100%', height: 'auto' }}>
        <ZoomableGroup center={pos.coordinates} zoom={pos.zoom} minZoom={1} maxZoom={6}
          onMoveEnd={(p) => setPos(p)} translateExtent={[[-1000, -600], [1000, 700]]}>
          <Sphere stroke="var(--wm-stroke)" strokeWidth={0.5} fill="var(--wm-ocean)" />
          <Graticule stroke="var(--wm-grat)" strokeWidth={0.4} />
          <Geographies geography={GEO}>
            {({ geographies }) => geographies.map((geo) => {
              const { key, count } = resolve(geo.properties.name)
              const t = count / max
              const active = key && selectedCountry && key === selectedCountry
              const fill = count ? `rgba(56,189,248,${0.3 + t * 0.6})` : 'var(--wm-land)'
              return (
                <Geography key={geo.rsmKey} geography={geo} fill={active ? '#f59e0b' : fill}
                  stroke={active ? '#f59e0b' : 'var(--wm-stroke)'} strokeWidth={active ? 1 : 0.4}
                  onMouseEnter={() => count && setTip(`${geo.properties.name}: ${count} signal${count > 1 ? 's' : ''} — click to filter`)}
                  onMouseLeave={() => setTip(null)}
                  onClick={() => count && onSelectCountry?.(key === selectedCountry ? null : key)}
                  style={{ default: { outline: 'none' }, hover: { fill: count ? '#38bdf8' : 'var(--wm-land)', outline: 'none', cursor: count ? 'pointer' : 'grab' }, pressed: { outline: 'none' } }} />
              )
            })}
          </Geographies>
          {markers.map((m) => (
            <Line key={`l-${m.name}`} from={m.coords} to={DHAKA} stroke="var(--accent)"
              strokeWidth={0.6 + (m.v / max) * 1.4} strokeOpacity={0.35} strokeLinecap="round" className="wm-arc" />
          ))}
          {markers.map((m) => {
            const r = 2.4 + (m.v / max) * 3.2
            return (
              <Marker key={`m-${m.name}`} coordinates={m.coords} style={{ default: { cursor: 'pointer' } }}
                onClick={() => onSelectCountry?.(m.name === selectedCountry ? null : m.name)}
                onMouseEnter={() => setTip(`${m.name}: ${m.v} signal${m.v > 1 ? 's' : ''} — click to filter`)} onMouseLeave={() => setTip(null)}>
                <circle r={r + 3} className="wm-pulse" />
                <circle r={r} className="wm-dot" />
              </Marker>
            )
          })}
          <Marker coordinates={DHAKA}>
            <circle r={5} className="wm-pulse home" />
            <circle r={3.2} className="wm-home" />
          </Marker>
        </ZoomableGroup>
      </ComposableMap>
      {tip && <div className="wm-tip">{tip}</div>}
    </div>
  )
}
