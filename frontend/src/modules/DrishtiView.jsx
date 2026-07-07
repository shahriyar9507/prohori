import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'
import EvidenceChain from '../components/EvidenceChain.jsx'
import { SectorDonut, SeverityDonut, RelevanceBars, EconLine, sectorColor } from '../components/Charts.jsx'

const SECTORS = ['trade', 'labour', 'security', 'water', 'energy', 'diplomacy', 'climate']
const SEVERITIES = ['red', 'amber', 'green']
// Which real World Bank series best contextualizes each sector.
const SECTOR_ECON = {
  trade: 'Exports (US$)', labour: 'Remittances (US$)', energy: 'Imports (US$)',
  water: 'GDP (US$)', diplomacy: 'Exports (US$)', security: 'GDP (US$)',
  climate: 'GDP (US$)', health: 'GDP (US$)', other: 'GDP (US$)',
}

export default function DrishtiView({ lang }) {
  const t = useStrings(lang)
  const [data, setData] = useState(null)
  const [econ, setEcon] = useState({})
  const [sector, setSector] = useState('')
  const [severity, setSeverity] = useState('')
  const [sel, setSel] = useState(null)
  const [brief, setBrief] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)

  useEffect(() => {
    let alive = true
    api.events().then((d) => alive && setData(d)).catch(() => {})
    api.econ().then((e) => alive && setEcon(e)).catch(() => {})
    return () => { alive = false }
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

  const econSeries = sel ? econ[SECTOR_ECON[sel.event.sectors[0]] || 'GDP (US$)'] : null
  const econLabel = sel ? (SECTOR_ECON[sel.event.sectors[0]] || 'GDP (US$)') : ''

  return (
    <div>
      <div className="section-title">{t.eventRadar}<span className="realbadge">📰 {t.liveNews}</span></div>

      {/* Intelligence dashboard */}
      <div className="intel-dash">
        <div className="tiles" style={{ marginBottom: 0 }}>
          <div className="tile readiness"><div className="num">{events.length}</div><div className="lbl">{t.totalEvents}</div></div>
          <div className="tile bad"><div className="num">{sevCounts.red}</div><div className="lbl">{t.redAlerts}</div></div>
          <div className="tile warn"><div className="num">{sevCounts.amber}</div><div className="lbl">{t.amberAlerts}</div></div>
        </div>
        <div className="panel"><div className="mini-title">{t.bySector}</div><SectorDonut data={sectorData} /></div>
        <div className="panel"><div className="mini-title">{t.bySeverity}</div><SeverityDonut counts={sevCounts} /></div>
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
            {data && <span className="banner">· {data.total} live events</span>}
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
