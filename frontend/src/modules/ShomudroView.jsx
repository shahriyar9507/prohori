import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'
import ShipIcon from '../components/ShipIcon.jsx'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
if (TOKEN) mapboxgl.accessToken = TOKEN

const STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  streets: 'mapbox://styles/mapbox/light-v11',
}
const VIEWS = { satellite: 'viewSat', dark: 'viewDark', streets: 'viewMap' }
const SAR_COORDS = [[90.2, 20.9], [90.9, 20.9], [90.9, 20.2], [90.2, 20.2]]

const ISO3_2 = { BGD: 'BD', CHN: 'CN', IND: 'IN', MMR: 'MM', LKA: 'LK', IDN: 'ID', PAN: 'PA',
  BLZ: 'BZ', SYC: 'SC', THA: 'TH', PAK: 'PK', MYS: 'MY', USA: 'US', GBR: 'GB', RUS: 'RU', VNM: 'VN' }
function flagEmoji(iso3) {
  const c = ISO3_2[iso3]
  if (!c) return '🏳️'
  return String.fromCodePoint(...[...c].map((x) => 127397 + x.charCodeAt(0)))
}
function shipVisual(kind, data) {
  if (kind === 'vessel') return ['fishing', '#38bdf8']
  if (kind === 'sar') return [(data.length_m || 0) > 120 ? 'cargo' : 'fishing', '#94a3b8']
  if (kind === 'dark') return ['dark', '#ff4d6a']
  if (kind === 'sts') return ['sts', '#f59e0b']
  if (kind === 'patrol') return ['patrol', '#22c55e']
  return ['generic', '#38bdf8']
}
// A ship-icon DOM marker (silhouette), colored per contact type.
function makeShipEl(color, pulse) {
  const el = document.createElement('div')
  el.className = 'ship-marker' + (pulse ? ' pulse' : '')
  el.style.setProperty('--mc', color)
  el.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24">
    <path d="M3.5 13 H20.5 L18 18.5 H6 Z" fill="${color}" stroke="#fff" stroke-width="0.8"/>
    <rect x="9" y="6.5" width="6" height="6.5" rx="1" fill="${color}" stroke="#fff" stroke-width="0.6"/>
    <path d="M12 6.5 V3" stroke="#fff" stroke-width="1.4"/></svg>`
  return el
}

export default function ShomudroView({ lang }) {
  const t = useStrings(lang)
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const markers = useRef({ ais: [], sar: [], dark: [], sts: [], patrol: [] })
  const picRef = useRef(null)
  const layersRef = useRef({ sarscene: false, ais: true, sar: true, dark: true, sts: true })
  const [pic, setPic] = useState(null)
  const [view, setView] = useState('satellite')
  const [contact, setContact] = useState(null)
  const [packet, setPacket] = useState(null)
  const [chips, setChips] = useState({})
  const [layers, setLayers] = useState(layersRef.current)
  const [mapErr, setMapErr] = useState(false)

  useEffect(() => {
    let alive = true
    api.picture().then((p) => { if (alive) { setPic(p); picRef.current = p } }).catch(() => {})
    fetch(`${import.meta.env.BASE_URL}demo/shomudro/sar_chips.json`).then((r) => r.json()).then((c) => alive && setChips(c)).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!pic || mapObj.current || !mapRef.current) return
    if (!TOKEN) { setMapErr(true); return }
    const [minLon, minLat, maxLon, maxLat] = pic.eez_bbox
    const map = new mapboxgl.Map({
      container: mapRef.current, style: STYLES.satellite,
      center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2], zoom: 6.4, pitch: 55, bearing: -12, antialias: true,
    })
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
    mapObj.current = map

    const addScene = () => {
      if (!map.getSource('mapbox-dem')) map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 })
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.3 })
      if (!map.getLayer('sky')) map.addLayer({ id: 'sky', type: 'sky', paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun-intensity': 6 } })
      if (layersRef.current.sarscene) addSar()
    }
    const addSar = () => {
      if (!map.getSource('sarscene')) map.addSource('sarscene', { type: 'image', url: `${import.meta.env.BASE_URL}demo/shomudro/sar_scene.png`, coordinates: SAR_COORDS })
      if (!map.getLayer('sarscene')) map.addLayer({ id: 'sarscene', type: 'raster', source: 'sarscene', paint: { 'raster-opacity': 0.92 } })
    }
    mapObj.current._addSar = addSar

    map.on('style.load', addScene)
    map.on('load', () => {
      map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 40, duration: 0 })
      const add = (lat, lon, color, kind, id, pulse) => {
        const el = makeShipEl(color, pulse)
        el.addEventListener('click', (e) => { e.stopPropagation(); selectFeature(kind, id) })
        return new mapboxgl.Marker({ element: el }).setLngLat([lon, lat]).addTo(map)
      }
      markers.current = { ais: [], sar: [], dark: [], sts: [], patrol: [] }
      pic.ais_tracks.forEach((a) => markers.current.ais.push(add(a.lat, a.lon, '#38bdf8', 'vessel', a.mmsi)))
      pic.sar_detections.forEach((d) => markers.current.sar.push(add(d.lat, d.lon, '#cbd5e1', 'sar', d.id)))
      pic.dark_vessels.forEach((d) => markers.current.dark.push(add(d.detection.lat, d.detection.lon, '#ff4d6a', 'dark', d.detection.id, true)))
      pic.sts_events.forEach((e) => markers.current.sts.push(add(e.lat, e.lon, '#f59e0b', 'sts', e.id)))
      pic.patrol_assets.forEach((a) => markers.current.patrol.push(add(a.lat, a.lon, '#22c55e', 'patrol', a.name)))
    })
    map.on('error', () => setMapErr(true))
    return () => { map.remove(); mapObj.current = null }
  }, [pic])

  function switchView(v) { setView(v); mapObj.current?.setStyle(STYLES[v]) }

  function toggleLayer(key) {
    setLayers((prev) => {
      const on = !prev[key]
      const map = mapObj.current
      if (map) {
        if (key === 'sarscene') {
          if (on) { map._addSar?.(); map.fitBounds([[90.2, 20.2], [90.9, 20.9]], { padding: 60 }) }
          else if (map.getLayer('sarscene')) map.removeLayer('sarscene')
        } else {
          markers.current[key]?.forEach((m) => { m.getElement().style.display = on ? '' : 'none' })
        }
      }
      const next = { ...prev, [key]: on }
      layersRef.current = next
      return next
    })
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
    if (kind === 'dark' || kind === 'sts') { setPacket(null); api.interdiction(id).then(setPacket).catch(() => setPacket(null)) }
    else setPacket(null)
    const lat = kind === 'dark' ? data.detection.lat : data.lat
    const lon = kind === 'dark' ? data.detection.lon : data.lon
    mapObj.current?.flyTo({ center: [lon, lat], zoom: 9, pitch: 55, duration: 1200 })
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
          {pic.counts.sar > 0 && <div className="tile"><div className="num" style={{ color: '#64748b' }}>{pic.counts.sar}</div><div className="lbl">{t.sarDetections}</div></div>}
          <div className="tile bad"><div className="num">{pic.counts.dark}</div><div className="lbl">{t.darkContacts}</div></div>
          <div className="tile warn"><div className="num">{pic.counts.sts}</div><div className="lbl">{t.stsEvents}</div></div>
        </div>
      )}

      <div className="map-wrap">
        <div>
          <div className="map-shell">
            <div className="map" ref={mapRef} />
            {mapErr && <div className="placeholder" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>Map needs a Mapbox token — sending it enables the 3D map.</div>}
            <div className="view-switch">
              {Object.entries(VIEWS).map(([k, label]) => (
                <button key={k} className={view === k ? 'active' : ''} onClick={() => switchView(k)}>{t[label]}</button>
              ))}
            </div>
          </div>
          <div className="layer-panel">
            <span className="lp-title">{t.layers}</span>
            {[
              { k: 'sarscene', c: '#94a3b8', label: t.sarScene, count: null },
              { k: 'ais', c: '#38bdf8', label: t.aisTracks, count: pic?.counts.ais },
              { k: 'sar', c: '#e2e8f0', label: t.sarDetections, count: pic?.counts.sar, hide: !(pic?.counts.sar > 0) },
              { k: 'dark', c: '#ff4d6a', label: t.darkContacts, count: pic?.counts.dark },
              { k: 'sts', c: '#f59e0b', label: t.stsEvents, count: pic?.counts.sts },
            ].filter((x) => !x.hide).map((x) => (
              <button key={x.k} className={`layer-item ${layers[x.k] ? 'on' : 'off'}`} onClick={() => toggleLayer(x.k)}>
                <i style={{ background: x.c }} /><span className="li-label">{x.label}</span>
                {x.count != null && <span className="li-count">{x.count}</span>}
                <span className="li-eye">{layers[x.k] ? '👁' : '🚫'}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <ContactProfile contact={contact} t={t} chips={chips} />
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

function Row({ k, v }) { return <div className="pk-row"><span className="k">{k}</span><span className="v">{v}</span></div> }

function ConfidenceBar({ value, t }) {
  const pct = Math.round((value || 0) * 100)
  return (
    <div className="confbar">
      <div className="confbar-caption">{t.confVessel}</div>
      <div className="confbar-track"><span style={{ width: `${pct}%` }} /></div>
      <div className="confbar-labels"><span>{t.low}</span><span>{t.medium}</span><span>{t.high}</span></div>
    </div>
  )
}

function ContactProfile({ contact, t, chips }) {
  if (!contact) return <div className="panel hud"><div className="section-title">{t.contactProfile}</div><div className="placeholder">{t.clickContact}</div></div>
  const { kind, data } = contact
  const pos = (lat, lon) => `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
  const chip = kind === 'sar' && chips ? chips[data.id] : null
  const [cat, col] = shipVisual(kind, kind === 'dark' ? data.detection : data)

  let title, typeLabel, rows
  if (kind === 'vessel') {
    title = `${data.name || 'Vessel'} ${flagEmoji(data.flag)}`; typeLabel = t.typeVessel
    rows = [[t.flag, data.flag || '—'], [t.mmsi, data.mmsi], [t.vesselClass, data.vessel_class], [t.length, data.length_m ? `${Math.round(data.length_m)} m` : '—'], [t.position, pos(data.lat, data.lon)], [t.dataSource, 'Global Fishing Watch']]
  } else if (kind === 'sar') {
    title = data.id; typeLabel = t.typeSar
    rows = [[t.length, `${Math.round(data.length_m)} m`], [t.confidence, `${Math.round(data.confidence * 100)}%`], [t.position, pos(data.lat, data.lon)], [t.dataSource, 'Sentinel-1 (Copernicus)']]
  } else if (kind === 'dark') {
    const d = data.detection; title = d.id; typeLabel = t.typeDark
    rows = [[t.riskScore, `${Math.round(data.risk_score)} · ${data.risk_level}`], [t.length, `${Math.round(d.length_m)} m`], [t.position, pos(d.lat, d.lon)], [t.dataSource, 'GFW AIS-gap']]
  } else if (kind === 'sts') {
    title = `${data.vessel_a} ↔ ${data.vessel_b}`; typeLabel = t.typeSts
    rows = [['A', data.vessel_a], ['B', data.vessel_b], ['Δ', `${Math.round(data.distance_m)} m`], [t.position, pos(data.lat, data.lon)], [t.dataSource, 'GFW encounter']]
  } else {
    title = data.name; typeLabel = 'Patrol asset'
    rows = [[t.position, pos(data.lat, data.lon)], [t.speed, `${data.sog} kn`]]
  }

  return (
    <div className="panel hud profile">
      <div className="section-title">{t.contactProfile}</div>
      <div className="ship-photo" style={{ '--ship-col': col }}>
        {chip ? <img className="sar-chip-img" src={chip} alt="SAR chip" /> : <ShipIcon category={cat} color={col} />}
        {chip && <span className="chip-tag">◉ {t.radarChip}</span>}
      </div>
      <div className="profile-head">
        <div className="profile-title">{title}</div>
        <span className="profile-type">{typeLabel}</span>
      </div>
      <div className="packet">
        {rows.map(([k, v], i) => <Row key={i} k={k} v={v} />)}
        {kind === 'sar' && <Row k={t.detectionMethod} v={t.automatic} />}
      </div>
      {kind === 'sar' && <ConfidenceBar value={data.confidence} t={t} />}
      {data.reasons && <ul className="profile-reasons">{data.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
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
