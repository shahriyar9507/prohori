import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'

// Dark command-center basemap (raster). Judges' browsers have internet;
// this frontend deploys as a normal site (no artifact CSP restrictions).
const MAP_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
}

const fc = (features) => ({ type: 'FeatureCollection', features })
const pt = (lon, lat, props) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: props })

// SHOMUDRO — Live Maritime Picture (S1) + dark shortlist (S2) + STS (S3) + interdiction (S9).
export default function ShomudroView({ lang }) {
  const t = useStrings(lang)
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const rafRef = useRef(0)
  const [pic, setPic] = useState(null)
  const [selected, setSelected] = useState(null)
  const [packet, setPacket] = useState(null)

  // Load the maritime picture once.
  useEffect(() => {
    let alive = true
    api.picture().then((p) => alive && setPic(p)).catch(() => {})
    return () => { alive = false }
  }, [])

  // Initialise the map once the container and data are ready.
  useEffect(() => {
    if (!pic || mapObj.current || !mapRef.current) return
    const [minLon, minLat, maxLon, maxLat] = pic.eez_bbox
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLE,
      bounds: [[minLon, minLat], [maxLon, maxLat]],
      fitBoundsOptions: { padding: 30 },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapObj.current = map

    map.on('load', () => {
      map.addSource('ais', { type: 'geojson', data: fc(pic.ais_tracks.map((a) => pt(a.lon, a.lat, { name: a.name || a.mmsi }))) })
      map.addLayer({ id: 'ais', type: 'circle', source: 'ais',
        paint: { 'circle-radius': 4, 'circle-color': '#38bdf8', 'circle-stroke-color': '#0a1020', 'circle-stroke-width': 1 } })

      const darkIds = new Set(pic.dark_vessels.map((d) => d.detection.id))
      map.addSource('sar', { type: 'geojson', data: fc(pic.sar_detections.filter((d) => !darkIds.has(d.id)).map((d) => pt(d.lon, d.lat, { id: d.id }))) })
      map.addLayer({ id: 'sar', type: 'circle', source: 'sar',
        paint: { 'circle-radius': 3, 'circle-color': '#64748b', 'circle-opacity': 0.7 } })

      map.addSource('dark', { type: 'geojson', data: fc(pic.dark_vessels.map((d) => pt(d.detection.lon, d.detection.lat, { id: d.detection.id, risk: d.risk_score, level: d.risk_level }))) })
      // Animated glow halo beneath the solid marker — draws the eye to threats.
      map.addLayer({ id: 'dark-pulse', type: 'circle', source: 'dark',
        paint: { 'circle-color': '#ff4d6a', 'circle-opacity': 0.35, 'circle-radius': 14, 'circle-blur': 0.6 } })
      map.addLayer({ id: 'dark', type: 'circle', source: 'dark',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'risk'], 30, 6, 100, 13],
          'circle-color': '#ff4d6a', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5, 'circle-opacity': 0.9,
        } })
      // Pulse loop.
      let r = 14, dir = 1
      const pulse = () => {
        r += dir * 0.45
        if (r > 32) dir = -1
        if (r < 14) dir = 1
        if (map.getLayer('dark-pulse')) {
          map.setPaintProperty('dark-pulse', 'circle-radius', r)
          map.setPaintProperty('dark-pulse', 'circle-opacity', Math.max(0, 0.4 * (1 - (r - 14) / 18)))
        }
        rafRef.current = requestAnimationFrame(pulse)
      }
      pulse()

      map.addSource('sts', { type: 'geojson', data: fc(pic.sts_events.map((e) => pt(e.lon, e.lat, { id: e.id }))) })
      map.addLayer({ id: 'sts', type: 'circle', source: 'sts',
        paint: { 'circle-radius': 10, 'circle-color': '#f59e0b', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2, 'circle-opacity': 0.6 } })

      map.addSource('patrol', { type: 'geojson', data: fc(pic.patrol_assets.map((a) => pt(a.lon, a.lat, { name: a.name }))) })
      map.addLayer({ id: 'patrol', type: 'circle', source: 'patrol',
        paint: { 'circle-radius': 7, 'circle-color': '#22c55e', 'circle-stroke-color': '#0a1020', 'circle-stroke-width': 2 } })

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 })
      const clickable = (layer, label) => {
        map.on('click', layer, (e) => setSelected(e.features[0].properties.id))
        map.on('mouseenter', layer, (e) => {
          map.getCanvas().style.cursor = 'pointer'
          const p = e.features[0].properties
          const html = layer === 'dark'
            ? `<strong>${p.id}</strong><br/>Dark contact · risk ${Math.round(p.risk)} (${p.level})`
            : `<strong>${p.id}</strong><br/>STS rendezvous`
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map)
        })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; popup.remove() })
      }
      clickable('dark', 'dark'); clickable('sts', 'sts')
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null }
    }
  }, [pic])

  // Fetch the interdiction packet when a target is selected.
  useEffect(() => {
    if (!selected) { setPacket(null); return }
    let alive = true
    api.interdiction(selected).then((p) => alive && setPacket(p)).catch(() => alive && setPacket(null))
    return () => { alive = false }
  }, [selected])

  return (
    <div>
      <div className="section-title">
        {t.maritimePicture}
        {pic?.source && <span className="realbadge">🛰️ REAL · GFW</span>}
        {pic && <span className="banner"> · {pic.source ? pic.source : `scene ${pic.scene_id}`}</span>}
      </div>

      {pic && (
        <div className="tiles" style={{ gridTemplateColumns: `repeat(${pic.source ? 3 : 4}, 1fr)` }}>
          <div className="tile"><div className="num" style={{ color: '#38bdf8' }}>{pic.counts.ais}</div><div className="lbl">{t.aisTracks}</div></div>
          {!pic.source && <div className="tile"><div className="num" style={{ color: '#94a3b8' }}>{pic.counts.sar}</div><div className="lbl">{t.sarDetections}</div></div>}
          <div className="tile bad"><div className="num">{pic.counts.dark}</div><div className="lbl">{t.darkContacts}</div></div>
          <div className="tile warn"><div className="num">{pic.counts.sts}</div><div className="lbl">{t.stsEvents}</div></div>
        </div>
      )}

      <div className="map-wrap">
        <div>
          <div className="map" ref={mapRef} />
          <div className="legend">
            <span><i style={{ background: '#38bdf8' }} />{t.aisTracks}</span>
            {!pic?.source && <span><i style={{ background: '#64748b' }} />{t.sarDetections}</span>}
            <span><i style={{ background: '#ef4444' }} />{t.darkContacts}</span>
            <span><i style={{ background: '#f59e0b' }} />{t.stsEvents}</span>
            <span><i style={{ background: '#22c55e' }} />CG patrol</span>
          </div>
        </div>

        <div>
          {/* Dark shortlist + STS list */}
          <div className="panel" style={{ marginBottom: 12 }}>
            <div className="section-title">{t.darkShortlist}</div>
            {pic?.dark_vessels.map((d) => (
              <div key={d.detection.id} className={`contact-row ${selected === d.detection.id ? 'active' : ''}`} onClick={() => setSelected(d.detection.id)}>
                <span className={`score sev-${d.risk_level === 'high' ? 'red' : d.risk_level === 'medium' ? 'amber' : 'green'}`} style={{ fontSize: 14, minWidth: 40 }}>{Math.round(d.risk_score)}</span>
                <span className="cid">{d.detection.id} · {Math.round(d.detection.length_m)} m</span>
              </div>
            ))}
            {pic?.sts_events.map((e) => (
              <div key={e.id} className={`contact-row ${selected === e.id ? 'active' : ''}`} onClick={() => setSelected(e.id)}>
                <span className="status-pill st-grounded">STS</span>
                <span className="cid">{e.vessel_a} ↔ {e.vessel_b}</span>
              </div>
            ))}
          </div>

          {/* Interdiction packet */}
          <div className="panel">
            <div className="section-title">{t.interdictionPacket}</div>
            {!packet && <div className="placeholder">{t.selectContact}</div>}
            {packet && (
              <div className="packet">
                <div className="pk-row"><span className="k">Target</span><span className="v">{packet.target_id}</span></div>
                <div className="pk-row"><span className="k">{t.lastFix}</span><span className="v">{packet.last_fix.lat.toFixed(3)}, {packet.last_fix.lon.toFixed(3)}</span></div>
                <div className="pk-row"><span className="k">{t.driftPredict}</span><span className="v">{packet.drift_prediction.lat.toFixed(3)}, {packet.drift_prediction.lon.toFixed(3)} @ {packet.drift_prediction.bearing_deg}°</span></div>
                <div className="pk-row"><span className="k">{t.nearestAsset}</span><span className="v">{packet.nearest_asset}</span></div>
                <div className="pk-row"><span className="k">{t.intercept}</span><span className="v">{packet.intercept.bearing_deg}° · {packet.intercept.distance_nm} nm</span></div>
                <div className="pk-row"><span className="k">{t.eta}</span><span className="v">{packet.intercept.eta_min} min</span></div>
                <div className="coc"><strong>{t.chainCustody}</strong><br />{packet.chain_of_custody_sha256}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
