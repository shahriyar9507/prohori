import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'

// Live UTC clock.
function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])
  return now
}
function useCountUp(target, ms = 1000) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf, start
    const step = (ts) => { if (!start) start = ts; const p = Math.min(1, (ts - start) / ms); setV(target * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

// Big semicircle posture gauge.
function PostureGauge({ score, label, color }) {
  const v = useCountUp(score)
  const a = Math.PI * (1 - Math.min(100, Math.max(0, v)) / 100)
  const cx = 100, cy = 100, r = 80
  const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a)
  return (
    <svg viewBox="0 0 200 118" className="posture">
      <path d="M20 100 A80 80 0 0 1 180 100" className="pg-track" />
      <path d={`M20 100 A80 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`} stroke={color} className="pg-arc" />
      <circle cx={x} cy={y} r="6" fill={color} className="pg-knob" />
      <text x="100" y="86" className="pg-val">{Math.round(v)}</text>
      <text x="100" y="106" className="pg-lbl">{label}</text>
    </svg>
  )
}

export default function NationalView({ lang, go }) {
  const t = useStrings(lang)
  const now = useClock()
  const [events, setEvents] = useState([])
  const [readiness, setReadiness] = useState(null)
  const [fleetAlerts, setFleetAlerts] = useState([])
  const [pic, setPic] = useState(null)

  useEffect(() => {
    let alive = true
    api.events().then((d) => alive && setEvents(d.events || [])).catch(() => {})
    api.eventsLive().then((l) => { if (alive && l?.events) setEvents(l.events) }).catch(() => {})
    api.readiness().then((r) => alive && setReadiness(r)).catch(() => {})
    api.fleetAlerts().then((a) => alive && setFleetAlerts(a)).catch(() => {})
    api.picture().then((p) => alive && setPic(p)).catch(() => {})
    return () => { alive = false }
  }, [])

  const redEvents = events.filter((s) => s.severity === 'red')
  const amberEvents = events.filter((s) => s.severity === 'amber')
  const ready = readiness?.overall?.readiness_pct ?? null
  const dark = pic?.counts?.dark ?? null
  const sts = pic?.counts?.sts ?? null

  // National posture 0–100 (higher = more strain), blended across modules.
  const posture = useMemo(() => {
    let s = 0, n = 0
    if (events.length) { s += Math.min(100, redEvents.length * 16 + amberEvents.length * 6); n++ }
    if (ready != null) { s += (100 - ready); n++ }
    if (dark != null) { s += Math.min(100, dark * 1.4); n++ }
    return n ? Math.round(s / n) : 0
  }, [events, redEvents.length, amberEvents.length, ready, dark])
  const pLevel = posture >= 60 ? { c: 'var(--red)', k: t.high2 } : posture >= 35 ? { c: 'var(--amber)', k: t.elevated } : { c: 'var(--green)', k: t.calm }

  // Unified cross-module alert stream.
  const stream = useMemo(() => {
    const out = []
    redEvents.slice(0, 4).forEach((s) => out.push({ mod: 'drishti', icon: '🛰️', sev: 'red', title: s.event.title, sub: `DRISHTI · relevance ${Math.round(s.relevance_score)}`, go: 'drishti' }))
    fleetAlerts.filter((a) => a.level === 'red').slice(0, 4).forEach((a) => out.push({ mod: 'rakkhok', icon: '🛡️', sev: 'red', title: a.message, sub: 'RAKKHOK · service-life', go: 'rakkhok' }))
    ;(pic?.dark_vessels || []).slice(0, 3).forEach((d, i) => out.push({ mod: 'shomudro', icon: '🌊', sev: 'amber', title: `Dark contact ${d.id || i + 1} — AIS-silent radar return`, sub: 'SHOMUDRO · maritime', go: 'shomudro' }))
    amberEvents.slice(0, 3).forEach((s) => out.push({ mod: 'drishti', icon: '🛰️', sev: 'amber', title: s.event.title, sub: `DRISHTI · relevance ${Math.round(s.relevance_score)}`, go: 'drishti' }))
    return out.slice(0, 12)
  }, [redEvents, amberEvents, fleetAlerts, pic])

  const cards = [
    { key: 'drishti', icon: '🛰️', bn: 'দৃষ্টি', name: 'DRISHTI', tag: 'Geopolitical intelligence', grad: 'grad-cyan',
      big: events.length, bigLbl: t.totalEvents, a: [`${redEvents.length} ${t.redAlerts.toLowerCase()}`, `${amberEvents.length} ${t.amberAlerts.toLowerCase()}`], val: events.length ? Math.min(100, (redEvents.length / events.length) * 100) : 0 },
    { key: 'rakkhok', icon: '🛡️', bn: 'রক্ষক', name: 'RAKKHOK', tag: 'Asset readiness', grad: 'grad-amber',
      big: ready != null ? `${ready}%` : '—', bigLbl: t.readinessPct, a: [`${readiness?.red_alerts ?? 0} ${t.redAlerts.toLowerCase()}`, `${readiness?.overall?.grounded ?? 0} ${t.grounded.toLowerCase()}`], val: ready ?? 0 },
    { key: 'shomudro', icon: '🌊', bn: 'সমুদ্র', name: 'SHOMUDRO', tag: 'Maritime awareness', grad: 'grad-teal',
      big: dark ?? '—', bigLbl: t.darkContacts, a: [`${sts ?? 0} ${t.stsEvents.toLowerCase()}`, `${pic?.counts?.sar ?? 0} ${t.sarDetections.toLowerCase()}`], val: dark != null ? Math.min(100, dark * 1.4) : 0 },
  ]

  return (
    <div className="national">
      {/* Warm hero */}
      <div className="nat-hero reveal">
        <div className="nh-badge">🇧🇩</div>
        <div className="nh-text">
          <div className="nh-eyebrow">C1 · National Situation Room</div>
          <h1>{t.nationalSituation}</h1>
          <div className="nh-sub">{t.across3} · {now.toISOString().slice(0, 10)} · {now.toISOString().slice(11, 19)} UTC</div>
        </div>
        <div className="nh-gauge">
          <PostureGauge score={posture} label={pLevel.k} color={pLevel.c} />
          <div className="nh-gl">{t.nationalPosture}</div>
        </div>
      </div>

      {/* Three module status cards */}
      <div className="nat-cards">
        {cards.map((c, i) => (
          <button key={c.key} className="nat-card reveal" style={{ animationDelay: `${i * 90}ms` }} onClick={() => go(c.key)}>
            <div className="ncd-head">
              <span className={`ncd-icon ${c.grad}`}>{c.icon}</span>
              <div className="ncd-t"><b>{c.name}</b><span>{lang === 'bn' ? c.bn : c.tag}</span></div>
            </div>
            <div className="ncd-big"><CountBig value={c.big} /><span>{c.bigLbl}</span></div>
            <div className="ncd-bar"><i className={c.grad} style={{ width: `${c.val}%` }} /></div>
            <div className="ncd-a">{c.a.map((x, j) => <span key={j}>{x}</span>)}</div>
            <div className="ncd-open">{t.viewSource.replace('↗', '')}→</div>
          </button>
        ))}
      </div>

      {/* Cross-module live alert stream */}
      <div className="section-title nat-stitle">🚨 {t.serviceLifeAlerts.includes('সতর্কতা') ? 'জাতীয় সতর্কতা প্রবাহ' : 'National alert stream'}
        <span className="realbadge">{stream.length}</span></div>
      <div className="nat-stream">
        {stream.map((a, i) => (
          <button key={i} className={`nsr reveal sel-${a.sev}`} style={{ animationDelay: `${i * 45}ms` }} onClick={() => go(a.go)}>
            <span className="nsr-ic">{a.icon}</span>
            <span className={`nsr-band sev-${a.sev}`} />
            <div className="nsr-body"><div className="nsr-title">{a.title}</div><div className="nsr-sub">{a.sub}</div></div>
            <span className="nsr-go">→</span>
          </button>
        ))}
        {!stream.length && <div className="placeholder">{t.loading}</div>}
      </div>
    </div>
  )
}

function CountBig({ value }) {
  const isNum = typeof value === 'number'
  const v = useCountUp(isNum ? value : 0)
  return <b>{isNum ? Math.round(v) : value}</b>
}
