import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'
import ShipIcon from '../components/ShipIcon.jsx'

// Map a contact to a vessel silhouette category + accent color.
function shipVisual(kind, data) {
  if (kind === 'vessel') return ['fishing', '#38bdf8']
  if (kind === 'sar') return [(data.length_m || 0) > 120 ? 'cargo' : 'fishing', '#cbd5e1']
  if (kind === 'dark') return ['dark', '#ff4d6a']
  if (kind === 'sts') return ['sts', '#f59e0b']
  if (kind === 'patrol') return ['patrol', '#22c55e']
  return ['generic', '#38bdf8']
}

// Free basemaps (no key / no billing): real satellite (Esri), dark, streets.
const BASEMAPS = {
  dark: { key: 'viewDark', url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap © CARTO' },
  satellite: { key: 'viewSat', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' },
  streets: { key: 'viewMap', url: 'https://a.basemaps.cartocdn.com/voyager/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap © CARTO' },
}

const ISO3_2 = { BGD: 'BD', CHN: 'CN', IND: 'IN', MMR: 'MM', LKA: 'LK', IDN: 'ID', PAN: 'PA',
  BLZ: 'BZ', SYC: 'SC', THA: 'TH', PAK: 'PK', MYS: 'MY', USA: 'US', GBR: 'GB', RUS: 'RU', VNM: 'VN' }
function flagEmoji(iso3) {
  const c = ISO3_2[iso3]
  if (!c) return '🏳️'
  return String.fromCodePoint(...[...c].map((x) => 127397 + x.charCodeAt(0)))
}

const fc = (features) => ({ type: 'FeatureCollection', features })
const pt = (lon, lat, props) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: props })

// SHOMUDRO — Live Maritime Picture (S1) + dark shortlist (S2) + STS (S3) + interdiction (S9).
export default function ShomudroView({ lang }) {
  const t = useStrings(lang)
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const rafRef = useRef(0)
  const picRef = useRef(null)
  const [pic, setPic] = useState(null)
  const [view, setView] = useState('dark')
  const [contact, setContact] = useState(null)   // { kind, data }
  const [packet, setPacket] = useState(null)

  useEffect(() => {
    let alive = true
    api.picture().then((p) => { if (alive) { setPic(p); picRef.current = p } }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!pic || mapObj.current || !mapRef.current) return
    const [minLon, minLat, maxLon, maxLat] = pic.eez_bbox
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: { basemap: { type: 'raster', tiles: [BASEMAPS.dark.url], tileSize: 256, attribution: BASEMAPS.dark.attribution } },
        layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
      },
      bounds: [[minLon, minLat], [maxLon, maxLat]],
      fitBoundsOptions: { padding: 30 },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapObj.current = map

    map.on('load', () => {
      map.addSource('ais', { type: 'geojson', data: fc(pic.ais_tracks.map((a) => pt(a.lon, a.lat, { kind: 'vessel', id: a.mmsi }))) })
      map.addLayer({ id: 'ais', type: 'circle', source: 'ais',
        paint: { 'circle-radius': 5, 'circle-color': '#38bdf8', 'circle-stroke-color': '#0a1020', 'circle-stroke-width': 1.5 } })

      map.addSource('sar', { type: 'geojson', data: fc(pic.sar_detections.map((d) => pt(d.lon, d.lat, { kind: 'sar', id: d.id }))) })
      map.addLayer({ id: 'sar', type: 'circle', source: 'sar',
        paint: { 'circle-radius': 5, 'circle-color': '#e2e8f0', 'circle-stroke-color': '#0a1020', 'circle-stroke-width': 1, 'circle-opacity': 0.85 } })

      map.addSource('dark', { type: 'geojson', data: fc(pic.dark_vessels.map((d) => pt(d.detection.lon, d.detection.lat, { kind: 'dark', id: d.detection.id, risk: d.risk_score }))) })
      map.addLayer({ id: 'dark-pulse', type: 'circle', source: 'dark',
        paint: { 'circle-color': '#ff4d6a', 'circle-opacity': 0.35, 'circle-radius': 14, 'circle-blur': 0.6 } })
      map.addLayer({ id: 'dark', type: 'circle', source: 'dark',
        paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'risk'], 30, 6, 100, 13],
          'circle-color': '#ff4d6a', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5, 'circle-opacity': 0.9 } })
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

      map.addSource('sts', { type: 'geojson', data: fc(pic.sts_events.map((e) => pt(e.lon, e.lat, { kind: 'sts', id: e.id }))) })
      map.addLayer({ id: 'sts', type: 'circle', source: 'sts',
        paint: { 'circle-radius': 10, 'circle-color': '#f59e0b', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2, 'circle-opacity': 0.6 } })

      map.addSource('patrol', { type: 'geojson', data: fc(pic.patrol_assets.map((a) => pt(a.lon, a.lat, { kind: 'patrol', id: a.name }))) })
      map.addLayer({ id: 'patrol', type: 'circle', source: 'patrol',
        paint: { 'circle-radius': 7, 'circle-color': '#22c55e', 'circle-stroke-color': '#0a1020', 'circle-stroke-width': 2 } })

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 })
      for (const layer of ['ais', 'sar', 'dark', 'sts', 'patrol']) {
        map.on('click', layer, (e) => selectFeature(e.features[0].properties.kind, e.features[0].properties.id))
        map.on('mouseenter', layer, (e) => {
          map.getCanvas().style.cursor = 'pointer'
          const p = e.features[0].properties
          popup.setLngLat(e.lngLat).setHTML(`<strong>${p.id}</strong>`).addTo(map)
        })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; popup.remove() })
      }
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null }
    }
  }, [pic])

  function switchView(v) {
    setView(v)
    const src = mapObj.current?.getSource('basemap')
    if (src) src.setTiles([BASEMAPS[v].url])
  }

  function selectFeature(kind, id) {
    const p = picRef.current
    if (!p) return
    let data = null
    if (kind === 'vessel') data = p.ais_tracks.find((x) => x.mmsi === id)
    else if (kind === 'sar') data = p.sar_detections.find((x) => x.id === id)
    else if (kind === 'dark') data = p.dark_vessels.find((x) => x.detection.id === id)
    else if (kind === 'sts') data = p.sts_events.find((x) => x.id === id)
    else if (kind === 'patrol') data = p.patrol_assets.find((x) => x.name === id)
    if (!data) return
    setContact({ kind, data })
    if (kind === 'dark' || kind === 'sts') {
      setPacket(null)
      api.interdiction(id).then(setPacket).catch(() => setPacket(null))
    } else {
      setPacket(null)
    }
    const [lon, lat] = kind === 'dark' ? [data.detection.lon, data.detection.lat] : [data.lon, data.lat]
    mapObj.current?.flyTo({ center: [lon, lat], zoom: 9, speed: 0.8 })
  }

  return (
    <div>
      <div className="section-title">
        {t.maritimePicture}
        {pic?.source && <span className="realbadge">🛰️ REAL DATA</span>}
        {pic && <span className="banner"> · {pic.source ? pic.source : `scene ${pic.scene_id}`}</span>}
      </div>

      {pic && (
        <div className="tiles" style={{ gridTemplateColumns: `repeat(${pic.counts.sar > 0 ? 4 : 3}, 1fr)` }}>
          <div className="tile"><div className="num" style={{ color: '#38bdf8' }}>{pic.counts.ais}</div><div className="lbl">{t.aisTracks}</div></div>
          {pic.counts.sar > 0 && <div className="tile"><div className="num" style={{ color: '#cbd5e1' }}>{pic.counts.sar}</div><div className="lbl">{t.sarDetections}</div></div>}
          <div className="tile bad"><div className="num">{pic.counts.dark}</div><div className="lbl">{t.darkContacts}</div></div>
          <div className="tile warn"><div className="num">{pic.counts.sts}</div><div className="lbl">{t.stsEvents}</div></div>
        </div>
      )}

      <div className="map-wrap">
        <div>
          <div className="map-shell">
            <div className="map" ref={mapRef} />
            <div className="view-switch">
              {Object.entries(BASEMAPS).map(([k, b]) => (
                <button key={k} className={view === k ? 'active' : ''} onClick={() => switchView(k)}>{t[b.key]}</button>
              ))}
            </div>
          </div>
          <div className="legend">
            <span><i style={{ background: '#38bdf8' }} />{t.aisTracks}</span>
            {pic?.counts?.sar > 0 && <span><i style={{ background: '#e2e8f0' }} />{t.sarDetections}</span>}
            <span><i style={{ background: '#ff4d6a' }} />{t.darkContacts}</span>
            <span><i style={{ background: '#f59e0b' }} />{t.stsEvents}</span>
            <span><i style={{ background: '#22c55e' }} />CG patrol</span>
          </div>
        </div>

        <div>
          <ContactProfile contact={contact} t={t} />
          {packet && <InterdictionPanel packet={packet} t={t} />}

          <div className="panel" style={{ marginTop: 12 }}>
            <div className="section-title">{t.darkShortlist}</div>
            {pic?.dark_vessels.slice(0, 8).map((d) => (
              <div key={d.detection.id} className={`contact-row ${contact?.data?.detection?.id === d.detection.id ? 'active' : ''}`} onClick={() => selectFeature('dark', d.detection.id)}>
                <span className={`score sev-${d.risk_level === 'high' ? 'red' : d.risk_level === 'medium' ? 'amber' : 'green'}`} style={{ fontSize: 14, minWidth: 40 }}>{Math.round(d.risk_score)}</span>
                <span className="cid">{d.detection.id}</span>
              </div>
            ))}
            {pic?.sts_events.slice(0, 6).map((e) => (
              <div key={e.id} className={`contact-row ${contact?.data?.id === e.id ? 'active' : ''}`} onClick={() => selectFeature('sts', e.id)}>
                <span className="status-pill st-grounded">STS</span>
                <span className="cid">{e.vessel_a} ↔ {e.vessel_b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Cyber contact-profile HUD card ────────────────────────────────────────
function Row({ k, v }) {
  return <div className="pk-row"><span className="k">{k}</span><span className="v">{v}</span></div>
}

function ContactProfile({ contact, t }) {
  if (!contact) return <div className="panel hud"><div className="section-title">{t.contactProfile}</div><div className="placeholder">{t.clickContact}</div></div>
  const { kind, data } = contact
  const pos = (lat, lon) => `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`

  let title, typeLabel, rows
  if (kind === 'vessel') {
    title = `${data.name || 'Vessel'} ${flagEmoji(data.flag)}`
    typeLabel = t.typeVessel
    rows = [[t.flag, data.flag || '—'], [t.mmsi, data.mmsi], [t.vesselClass, data.vessel_class], [t.length, data.length_m ? `${Math.round(data.length_m)} m` : '—'], [t.position, pos(data.lat, data.lon)], [t.dataSource, 'Global Fishing Watch']]
  } else if (kind === 'sar') {
    title = data.id
    typeLabel = t.typeSar
    rows = [[t.length, `${Math.round(data.length_m)} m`], [t.confidence, `${Math.round(data.confidence * 100)}%`], [t.position, pos(data.lat, data.lon)], [t.dataSource, 'Sentinel-1 (Copernicus)']]
  } else if (kind === 'dark') {
    const d = data.detection
    title = d.id
    typeLabel = t.typeDark
    rows = [[t.riskScore, `${Math.round(data.risk_score)} · ${data.risk_level}`], [t.length, `${Math.round(d.length_m)} m`], [t.position, pos(d.lat, d.lon)], [t.dataSource, 'GFW AIS-gap']]
  } else if (kind === 'sts') {
    title = `${data.vessel_a} ↔ ${data.vessel_b}`
    typeLabel = t.typeSts
    rows = [['A', data.vessel_a], ['B', data.vessel_b], ['Δ', `${Math.round(data.distance_m)} m`], [t.position, pos(data.lat, data.lon)], [t.dataSource, 'GFW encounter']]
  } else {
    title = data.name; typeLabel = 'Patrol asset'
    rows = [[t.position, pos(data.lat, data.lon)], [t.speed, `${data.sog} kn`]]
  }

  const [cat, col] = shipVisual(kind, kind === 'dark' ? data.detection : data)
  return (
    <div className="panel hud profile">
      <div className="section-title">{t.contactProfile}</div>
      <div className="ship-photo" style={{ '--ship-col': col }}>
        <ShipIcon category={cat} color={col} />
      </div>
      <div className="profile-head">
        <div className="profile-title">{title}</div>
        <span className="profile-type">{typeLabel}</span>
      </div>
      <div className="packet">
        {rows.map(([k, v], i) => <Row key={i} k={k} v={v} />)}
      </div>
      {data.reasons && (
        <ul className="profile-reasons">
          {data.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </div>
  )
}

function InterdictionPanel({ packet, t }) {
  return (
    <div className="panel hud" style={{ marginTop: 12 }}>
      <div className="section-title">{t.interdictionPacket}</div>
      <div className="packet">
        <div className="pk-row"><span className="k">Target</span><span className="v">{packet.target_id}</span></div>
        <div className="pk-row"><span className="k">{t.lastFix}</span><span className="v">{packet.last_fix.lat.toFixed(3)}, {packet.last_fix.lon.toFixed(3)}</span></div>
        <div className="pk-row"><span className="k">{t.driftPredict}</span><span className="v">{packet.drift_prediction.lat.toFixed(3)}, {packet.drift_prediction.lon.toFixed(3)} @ {packet.drift_prediction.bearing_deg}°</span></div>
        <div className="pk-row"><span className="k">{t.nearestAsset}</span><span className="v">{packet.nearest_asset}</span></div>
        <div className="pk-row"><span className="k">{t.intercept}</span><span className="v">{packet.intercept.bearing_deg}° · {packet.intercept.distance_nm} nm</span></div>
        <div className="pk-row"><span className="k">{t.eta}</span><span className="v">{packet.intercept.eta_min} min</span></div>
        <div className="coc"><strong>{t.chainCustody}</strong><br />{packet.chain_of_custody_sha256}</div>
      </div>
    </div>
  )
}
