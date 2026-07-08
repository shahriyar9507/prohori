import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'
import ShipIcon from '../components/ShipIcon.jsx'
import { loadGoogleMaps, DARK_STYLE } from '../gmaps.js'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
// SAR scene AOI (matches the real Sentinel-1 image bounds)
const SAR_BOUNDS = { north: 20.9, south: 20.2, east: 90.9, west: 90.2 }
const VIEWS = { dark: 'viewDark', satellite: 'viewSat', streets: 'viewMap' }

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

export default function ShomudroView({ lang }) {
  const t = useStrings(lang)
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const markers = useRef({ ais: [], sar: [], dark: [], sts: [], patrol: [] })
  const overlay = useRef(null)
  const picRef = useRef(null)
  const [pic, setPic] = useState(null)
  const [view, setView] = useState('satellite')
  const [contact, setContact] = useState(null)
  const [packet, setPacket] = useState(null)
  const [chips, setChips] = useState({})
  const [layers, setLayers] = useState({ sarscene: false, ais: true, sar: true, dark: true, sts: true })
  const [mapErr, setMapErr] = useState(false)

  useEffect(() => {
    let alive = true
    api.picture().then((p) => { if (alive) { setPic(p); picRef.current = p } }).catch(() => {})
    fetch(`${import.meta.env.BASE_URL}demo/shomudro/sar_chips.json`).then((r) => r.json()).then((c) => alive && setChips(c)).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!pic || mapObj.current || !mapRef.current) return
    loadGoogleMaps(MAPS_KEY).then((g) => {
      const [minLon, minLat, maxLon, maxLat] = pic.eez_bbox
      const map = new g.maps.Map(mapRef.current, {
        center: { lat: (minLat + maxLat) / 2, lng: (minLon + maxLon) / 2 },
        zoom: 7, mapTypeId: 'hybrid', mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, backgroundColor: '#0a1122',
      })
      map.fitBounds({ north: maxLat, south: minLat, east: maxLon, west: minLon })
      mapObj.current = map

      const mk = (lat, lon, color, scale, kind, id, z) => {
        const m = new g.maps.Marker({
          position: { lat, lng: lon }, map,
          icon: { path: g.maps.SymbolPath.CIRCLE, scale, fillColor: color, fillOpacity: 0.9, strokeColor: '#ffffff', strokeWeight: 1.3 },
          zIndex: z, title: id,
        })
        m.addListener('click', () => selectFeature(kind, id))
        return m
      }
      markers.current = { ais: [], sar: [], dark: [], sts: [], patrol: [] }
      pic.ais_tracks.forEach((a) => markers.current.ais.push(mk(a.lat, a.lon, '#38bdf8', 5, 'vessel', a.mmsi, 2)))
      pic.sar_detections.forEach((d) => markers.current.sar.push(mk(d.lat, d.lon, '#e2e8f0', 5, 'sar', d.id, 3)))
      pic.dark_vessels.forEach((d) => markers.current.dark.push(mk(d.detection.lat, d.detection.lon, '#ff4d6a', 7 + d.risk_score / 20, 'dark', d.detection.id, 6)))
      pic.sts_events.forEach((e) => markers.current.sts.push(mk(e.lat, e.lon, '#f59e0b', 9, 'sts', e.id, 4)))
      pic.patrol_assets.forEach((a) => markers.current.patrol.push(mk(a.lat, a.lon, '#22c55e', 7, 'patrol', a.name, 5)))

      overlay.current = new g.maps.GroundOverlay(`${import.meta.env.BASE_URL}demo/shomudro/sar_scene.png`, SAR_BOUNDS, { opacity: 0.9 })
      applyView('satellite')
    }).catch(() => setMapErr(true))
    return () => {
      Object.values(markers.current).flat().forEach((m) => m.setMap && m.setMap(null))
      overlay.current?.setMap(null)
      mapObj.current = null
    }
  }, [pic])

  function applyView(v) {
    const g = window.google, map = mapObj.current
    if (!g || !map) return
    if (v === 'satellite') { map.setMapTypeId('hybrid'); map.setOptions({ styles: [] }) }
    else if (v === 'streets') { map.setMapTypeId('roadmap'); map.setOptions({ styles: [] }) }
    else { map.setMapTypeId('roadmap'); map.setOptions({ styles: DARK_STYLE }) }
  }
  function switchView(v) { setView(v); applyView(v) }

  function toggleLayer(key) {
    setLayers((prev) => {
      const on = !prev[key]
      const map = mapObj.current
      if (map) {
        if (key === 'sarscene') {
          overlay.current?.setMap(on ? map : null)
          if (on) map.fitBounds(SAR_BOUNDS)
        } else {
          markers.current[key]?.forEach((m) => m.setMap(on ? map : null))
        }
      }
      return { ...prev, [key]: on }
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
    if (kind === 'dark' || kind === 'sts') {
      setPacket(null)
      api.interdiction(id).then(setPacket).catch(() => setPacket(null))
    } else setPacket(null)
    const lat = kind === 'dark' ? data.detection.lat : data.lat
    const lon = kind === 'dark' ? data.detection.lon : data.lon
    mapObj.current?.panTo({ lat, lng: lon })
    if (mapObj.current?.getZoom() < 8) mapObj.current.setZoom(9)
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
            {mapErr && <div className="placeholder" style={{ position: 'absolute', inset: 0 }}>Map failed to load (check Maps key/referrer).</div>}
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
