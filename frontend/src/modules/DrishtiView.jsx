import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'
import EvidenceChain from '../components/EvidenceChain.jsx'
import EventWorldMap from '../components/WorldMap.jsx'
import { SectorDonut, SeverityDonut, RelevanceBars, EconLine, sectorColor } from '../components/Charts.jsx'

const SECTORS = ['trade', 'labour', 'security', 'water', 'energy', 'diplomacy', 'climate']
const SEVERITIES = ['red', 'amber', 'green']
const SECTOR_ECON = {
  trade: 'Exports (US$)', labour: 'Remittances (US$)', energy: 'Imports (US$)',
  water: 'GDP (US$)', diplomacy: 'Exports (US$)', security: 'GDP (US$)',
  climate: 'GDP (US$)', health: 'GDP (US$)', other: 'GDP (US$)',
}

/* ── small helpers ──────────────────────────────────────────────────── */
function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf, start
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}
function daysAgo(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const n = Math.floor((Date.now() - d.getTime()) / 86400000)
  return n <= 0 ? 'today' : n === 1 ? '1d ago' : `${n}d ago`
}
function cleanSource(s = '') { return s.replace(/\s*\(Google News\)\s*/i, '').trim() || 'News' }
function initials(s = '') { return cleanSource(s).replace(/[^A-Za-z ]/g, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'N' }
function avatarHue(s = '') { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h }
function sentimentOf(ev) {
  const g = ev.goldstein ?? ev.tone ?? 0
  if (g > 1) return { k: 'pos', label: 'positive' }
  if (g < -1) return { k: 'neg', label: 'negative' }
  return { k: 'neu', label: 'neutral' }
}
function relAgo(ts, t) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  return s < 60 ? t.justNow : `${Math.floor(s / 60)} ${t.minAgo}`
}
function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])
  return now.toISOString().slice(11, 19) + ' UTC'
}

/* ── KPI with animated counter ──────────────────────────────────────── */
function Kpi({ value, label, cls }) {
  const v = useCountUp(value || 0)
  return <div className={`kpi ${cls}`}><div className="num">{v}</div><div className="lbl">{label}</div></div>
}

/* ── scrolling live signals ticker ──────────────────────────────────── */
function Ticker({ events }) {
  if (!events.length) return null
  const items = events.slice(0, 14)
  const row = (keyp) => items.map((s, i) => {
    const sent = sentimentOf(s.event)
    return (
      <span className="tick-item" key={`${keyp}-${i}`}>
        <i className={`tick-dot sev-${s.severity}`} />
        <b className={`tick-sent ${sent.k}`}>{cleanSource(s.event.source)}</b>
        {s.event.title}
        <span className="tick-sep">◆</span>
      </span>
    )
  })
  return (
    <div className="ticker">
      <span className="tick-tag">◉ LIVE SIGNALS</span>
      <div className="tick-track"><div className="tick-run">{row('a')}{row('b')}</div></div>
    </div>
  )
}

export default function DrishtiView({ lang }) {
  const t = useStrings(lang)
  const clock = useClock()
  const [data, setData] = useState(null)
  const [econ, setEcon] = useState({})
  const [live, setLive] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [sector, setSector] = useState('')
  const [severity, setSeverity] = useState('')
  const [sel, setSel] = useState(null)
  const [brief, setBrief] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [, setTick] = useState(0)
  const aliveRef = useRef(true)
  const reportRef = useRef(null)

  useEffect(() => {
    aliveRef.current = true
    api.events().then((d) => aliveRef.current && setData((prev) => prev || d)).catch(() => {})
    api.econ().then((e) => aliveRef.current && setEcon(e)).catch(() => {})
    const pull = async () => {
      const l = await api.eventsLive()
      if (!aliveRef.current) return
      if (l && l.events?.length) { setData(l); setLive(true); setUpdatedAt(Date.now()) }
      else setUpdatedAt((p) => p || Date.now())
    }
    pull()
    const poll = setInterval(pull, 5 * 60 * 1000)
    const tk = setInterval(() => setTick((x) => x + 1), 30 * 1000)
    return () => { aliveRef.current = false; clearInterval(poll); clearInterval(tk) }
  }, [])

  useEffect(() => {
    if (!sel) { setBrief(null); return }
    let alive = true
    setBriefLoading(true)
    api.brief(sel.event.id, lang).then((b) => alive && setBrief(b)).catch(() => alive && setBrief(null)).finally(() => alive && setBriefLoading(false))
    return () => { alive = false }
  }, [sel, lang])

  function openReport(s) {
    setSel(s)
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const events = data?.events || []
  const shown = events.filter((s) => (!sector || s.event.sectors.includes(sector)) && (!severity || s.severity === severity))

  const sectorData = useMemo(() => {
    const m = {}
    events.forEach((s) => s.event.sectors.forEach((sec) => { m[sec] = (m[sec] || 0) + 1 }))
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [events])
  const sevCounts = useMemo(() => {
    const c = { red: 0, amber: 0, green: 0 }
    events.forEach((s) => { c[s.severity] = (c[s.severity] || 0) + 1 })
    return c
  }, [events])
  const topActors = useMemo(() => {
    const m = {}
    events.forEach((s) => (s.event.actors || []).forEach((a) => { if (a !== 'Bangladesh') m[a] = (m[a] || 0) + 1 }))
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)
  }, [events])
  const maxActor = Math.max(1, ...topActors.map((a) => a.value))

  const econSeries = sel ? econ[SECTOR_ECON[sel.event.sectors[0]] || 'GDP (US$)'] : null
  const econLabel = sel ? (SECTOR_ECON[sel.event.sectors[0]] || 'GDP (US$)') : ''

  return (
    <div className="drishti">
      {/* Command hero */}
      <div className="cmd-hero">
        <div className="ch-grid" />
        <div className="ch-main">
          <div className="ch-eyebrow">দৃষ্টি · DRISHTI — Geopolitical Intelligence</div>
          <h1 className="ch-title">{t.eventRadar}</h1>
          <div className="ch-sub">Bangladesh Relevance Engine · real-time open-source intelligence</div>
        </div>
        <div className="ch-side">
          <div className={`live-pill ${live ? 'on' : ''}`}><i />{t.liveNow}</div>
          <div className="ch-clock">{clock}</div>
          {updatedAt && <div className="ch-stamp">{t.updated} {relAgo(updatedAt, t)}</div>}
          <div className="ch-src">📡 Google News · World Bank · Gemini</div>
        </div>
      </div>

      {/* Live signals ticker */}
      <Ticker events={events} />

      {/* Analytical bento */}
      <div className="bento">
        <div className="bento-kpis">
          <Kpi value={events.length} label={t.totalEvents} cls="kpi-total" />
          <Kpi value={sevCounts.red} label={t.redAlerts} cls="kpi-red" />
          <Kpi value={sevCounts.amber} label={t.amberAlerts} cls="kpi-amber" />
          <Kpi value={topActors.length} label={t.countriesInPlay} cls="kpi-actors" />
        </div>
        <div className="panel bento-map">
          <div className="mini-title">🌐 {t.geoFootprint}<span className="pnl-tag">live arcs → Dhaka</span></div>
          <EventWorldMap events={events} />
        </div>
        <div className="panel bento-actors">
          <div className="mini-title">{t.topActors}</div>
          <div className="actor-bars">
            {topActors.map((a) => (
              <div className="actor-row" key={a.name}>
                <span className="an">{a.name}</span>
                <span className="ab"><i style={{ width: `${(a.value / maxActor) * 100}%` }} /></span>
                <span className="av">{a.value}</span>
              </div>
            ))}
            {!topActors.length && <div className="placeholder">{t.loading}</div>}
          </div>
        </div>
        <div className="panel bento-sector"><div className="mini-title">{t.bySector}</div><SectorDonut data={sectorData} /></div>
        <div className="panel bento-sev"><div className="mini-title">{t.bySeverity}</div><SeverityDonut counts={sevCounts} /></div>
      </div>

      {/* Intelligence report (opens above the wall on selection) */}
      {sel && (
        <div ref={reportRef} className="panel hud report drishti-report">
          <button className="report-close" onClick={() => setSel(null)} aria-label="close">✕</button>
          <div className="report-head">
            <h2>{sel.event.title}</h2>
            <div className={`score sev-${sel.severity}`} style={{ fontSize: 22 }}>{Math.round(sel.relevance_score)}<small>{t.relevance}</small></div>
          </div>
          <div className="event-meta" style={{ marginBottom: 10 }}>
            <span>{sel.event.event_date}</span>
            {sel.event.sectors.map((x) => <span className="chip" key={x} style={{ borderColor: sectorColor(x) }}>{x}</span>)}
            {sel.event.url && <a className="src-link" href={sel.event.url} target="_blank" rel="noreferrer">{t.viewSource}</a>}
          </div>
          <div className="report-cols">
            <div>
              <div className="mini-title">{t.relevanceBreakdown}</div>
              <RelevanceBars components={sel.components} />
              {briefLoading && <div className="loading">{t.loading}</div>}
              {brief && !brief.refused && (
                <>
                  <div className="why" style={{ marginTop: 12 }}><strong>{t.whyItMatters}:</strong> {brief.why_it_matters}</div>
                  <div className="doavoid">
                    <div className="col-do"><h3>✔ {t.doColumn}</h3>{brief.do.map((r, i) => <div className="rec" key={i}>{r.action}</div>)}</div>
                    <div className="col-avoid"><h3>✕ {t.avoidColumn}</h3>{brief.avoid.map((r, i) => <div className="rec" key={i}>{r.action}</div>)}</div>
                  </div>
                  <div className="window">⏱ {t.decisionWindow}: {brief.decision_window}</div>
                </>
              )}
              {brief?.refused && <div className="refused">⚠ {t.refused}. {brief.refusal_reason}</div>}
            </div>
            <div>
              {econSeries && econSeries.length > 0 && (
                <>
                  <div className="mini-title">{t.economicContext} · {econLabel}</div>
                  <EconLine series={econSeries} colorIdx={0} />
                </>
              )}
              {brief && <EvidenceChain meta={brief.meta} evidence={brief.evidence} label={t.confidence} />}
              <AskMore event={sel.event} lang={lang} t={t} />
            </div>
          </div>
        </div>
      )}

      {/* Live Intelligence Feed — the news wall */}
      <div className="section-title feed-title">
        📰 {t.liveNews}
        <span className="realbadge">{shown.length} {t.totalEvents.toLowerCase()}</span>
        <div className="filters feed-filters">
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">{t.allSectors}</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">{t.allSeverities}</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="poll-note">⟳ {t.autoPolling}</span>
        </div>
      </div>

      {!data && <div className="loading">{t.loading}</div>}
      <div className="news-wall">
        {shown.map((s) => {
          const sent = sentimentOf(s.event)
          const hue = avatarHue(s.event.source || '')
          return (
            <article key={s.event.id} className={`news-card sel-${s.severity} ${sel?.event.id === s.event.id ? 'active' : ''}`} onClick={() => openReport(s)}>
              <div className="nc-top">
                <span className="nc-av" style={{ background: `hsl(${hue} 70% 45%)` }}>{initials(s.event.source)}</span>
                <div className="nc-src">
                  <b>{cleanSource(s.event.source)}</b>
                  <span>{daysAgo(s.event.event_date)}</span>
                </div>
                <div className={`nc-score sev-${s.severity}`}>{Math.round(s.relevance_score)}</div>
              </div>
              <h3 className="nc-title">{s.event.title}</h3>
              <div className="nc-tags">
                <span className={`nc-sent ${sent.k}`}>{sent.label}</span>
                {s.event.sectors.slice(0, 3).map((x) => <span className="chip" key={x} style={{ borderColor: sectorColor(x) }}>{x}</span>)}
                {s.event.actors.filter((a) => a !== 'Bangladesh').slice(0, 2).map((a) => <span className="nc-actor" key={a}>{a}</span>)}
              </div>
              <div className="nc-foot">
                <span className={`nc-band sev-${s.severity}`} />
                <span className="nc-open">Open brief →</span>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function AskMore({ event, lang, t }) {
  const [q, setQ] = useState('')
  const [resp, setResp] = useState(null)
  const [loading, setLoading] = useState(false)
  async function submit(e) {
    e.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    try { setResp(await api.ask(`Regarding "${event.title}": ${q}`, lang)) }
    catch (err) { setResp({ answer: String(err), evidence: [], meta: null }) }
    finally { setLoading(false) }
  }
  return (
    <div className="ask" style={{ marginTop: 16 }}>
      <div className="mini-title">💬 {t.askAboutThis}</div>
      <form className="ask-row" onSubmit={submit}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.askThisPlaceholder} />
        <button type="submit">{t.send}</button>
      </form>
      {loading && <div className="loading">{t.loading}</div>}
      {resp && !loading && <div className="answer">{resp.answer}<EvidenceChain meta={resp.meta} evidence={resp.evidence} label={t.confidence} /></div>}
    </div>
  )
}
