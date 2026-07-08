import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'
import EvidenceChain from '../components/EvidenceChain.jsx'
import EventWorldMap from '../components/WorldMap.jsx'
import { SectorDonut, SeverityDonut, RelevanceBars, EconLine, sectorColor } from '../components/Charts.jsx'

const SECTORS = ['trade', 'labour', 'security', 'water', 'energy', 'diplomacy', 'climate']
const SEVERITIES = ['red', 'amber', 'green']
// Which real World Bank series best contextualizes each sector.
const SECTOR_ECON = {
  trade: 'Exports (US$)', labour: 'Remittances (US$)', energy: 'Imports (US$)',
  water: 'GDP (US$)', diplomacy: 'Exports (US$)', security: 'GDP (US$)',
  climate: 'GDP (US$)', health: 'GDP (US$)', other: 'GDP (US$)',
}

function relAgo(ts, t) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return t.justNow
  return `${Math.floor(s / 60)} ${t.minAgo}`
}

export default function DrishtiView({ lang }) {
  const t = useStrings(lang)
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

  // Real-time pipeline: show the baked snapshot instantly, then poll the live
  // backend (Google News → scored events) and swap it in — refreshing forever.
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
    <div>
      <div className="section-title">
        {t.eventRadar}
        <span className={`live-pill ${live ? 'on' : ''}`}><i />{t.liveNow}</span>
        {updatedAt && <span className="live-stamp">{t.updated} {relAgo(updatedAt, t)}</span>}
        <span className="realbadge">📰 {t.liveNews}</span>
      </div>

      {/* Analytical bento dashboard */}
      <div className="bento">
        <div className="bento-kpis">
          <div className="kpi kpi-total"><div className="num">{events.length}</div><div className="lbl">{t.totalEvents}</div></div>
          <div className="kpi kpi-red"><div className="num">{sevCounts.red}</div><div className="lbl">{t.redAlerts}</div></div>
          <div className="kpi kpi-amber"><div className="num">{sevCounts.amber}</div><div className="lbl">{t.amberAlerts}</div></div>
          <div className="kpi kpi-actors"><div className="num">{topActors.length}</div><div className="lbl">{t.countriesInPlay}</div></div>
        </div>

        <div className="panel bento-map">
          <div className="mini-title">🌐 {t.geoFootprint}</div>
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

      <div className="two-col">
        {/* Event feed */}
        <section>
          <div className="filters">
            <select value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">{t.allSectors}</option>
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">{t.allSeverities}</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {data && <span className="banner">· {shown.length} {t.totalEvents.toLowerCase()}</span>}
            <span className="poll-note">⟳ {t.autoPolling}</span>
          </div>
          {!data && <div className="loading">{t.loading}</div>}
          {shown.map((s) => (
            <div key={s.event.id} className={`event-card sel-${s.severity} ${sel?.event.id === s.event.id ? 'active' : ''}`} onClick={() => setSel(s)}>
              <div className="event-head">
                <div>
                  <div className="event-title">{s.event.title}</div>
                  <div className="event-meta">
                    <span>{s.event.event_date}</span>
                    {s.event.sectors.slice(0, 3).map((x) => <span className="chip" key={x} style={{ borderColor: sectorColor(x) }}>{x}</span>)}
                  </div>
                </div>
                <div className={`score sev-${s.severity}`}>{Math.round(s.relevance_score)}<small>{t.relevance}</small></div>
              </div>
            </div>
          ))}
        </section>

        {/* Intelligence report */}
        <section>
          <div className="section-title">{t.report}</div>
          {!sel ? (
            <div className="panel hud"><div className="placeholder">{t.selectForReport}</div></div>
          ) : (
            <div className="panel hud report">
              <div className="report-head">
                <h2>{sel.event.title}</h2>
                <div className={`score sev-${sel.severity}`} style={{ fontSize: 22 }}>{Math.round(sel.relevance_score)}<small>{t.relevance}</small></div>
              </div>
              <div className="event-meta" style={{ marginBottom: 10 }}>
                <span>{sel.event.event_date}</span>
                {sel.event.sectors.map((x) => <span className="chip" key={x} style={{ borderColor: sectorColor(x) }}>{x}</span>)}
                {sel.event.url && <a className="src-link" href={sel.event.url} target="_blank" rel="noreferrer">{t.viewSource}</a>}
              </div>

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

              {econSeries && econSeries.length > 0 && (
                <>
                  <div className="mini-title" style={{ marginTop: 16 }}>{t.economicContext} · {econLabel}</div>
                  <EconLine series={econSeries} colorIdx={0} />
                </>
              )}

              {brief && <EvidenceChain meta={brief.meta} evidence={brief.evidence} label={t.confidence} />}
              <AskMore event={sel.event} lang={lang} t={t} />
            </div>
          )}
        </section>
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
