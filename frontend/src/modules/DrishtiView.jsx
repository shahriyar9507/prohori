import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'
import EvidenceChain from '../components/EvidenceChain.jsx'
import EventWorldMap from '../components/WorldMap.jsx'
import KpiCard from '../components/KpiCard.jsx'
import { SectorDonut, SeverityDonut, RelevanceBars, EconLine, SentimentBar, ActorBar, DayTrend, sectorColor } from '../components/Charts.jsx'
import { EarlyWarning, RegionFocus } from '../components/IntelSections.jsx'
import { Newspaper, AlertTriangle, Bell, Users, Globe2, BarChart3, PieChart, LineChart, Smile, Radio, Flame, MapPinned, Satellite } from 'lucide-react'

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
function daysAgo(dateStr, t) {
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const n = Math.floor((Date.now() - d.getTime()) / 86400000)
  return n <= 0 ? t.todayWord : `${n}${t.dayAgoWord}`
}
function sentLabel(k, t) { return k === 'pos' ? t.sentPos : k === 'neg' ? t.sentNeg : t.sentNeu }
function cleanSource(s = '') { return s.replace(/\s*\(Google News\)\s*/i, '').trim() || 'News' }
function initials(s = '') { return cleanSource(s).replace(/[^A-Za-z ]/g, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'N' }
function avatarHue(s = '') { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h }

// Map a publication name → its domain, so we can show the REAL publisher logo.
const SRC_DOMAIN = {
  'the daily star': 'thedailystar.net', 'the financial express': 'thefinancialexpress.com.bd',
  'the business standard': 'tbsnews.net', 'tbs news': 'tbsnews.net', 'new age': 'newagebd.net',
  'united news of bangladesh': 'unb.com.bd', 'bdnews24': 'bdnews24.com', 'dhaka tribune': 'dhakatribune.com',
  'prothom alo': 'en.prothomalo.com', 'business post': 'businesspostbd.com', 'the daily observer': 'observerbd.com',
  'daily sun': 'daily-sun.com', 'textile today': 'textiletoday.com.bd', 'fibre2fashion': 'fibre2fashion.com',
  'apparel views': 'apparelviews.com', 'just style': 'just-style.com', 'just-style': 'just-style.com',
  'modern diplomacy': 'moderndiplomacy.eu', 'big news network': 'bignewsnetwork.com', 'awaz the voice': 'awazthevoice.in',
  'the hindu': 'thehindu.com', 'times of india': 'timesofindia.indiatimes.com', 'economic times': 'economictimes.indiatimes.com',
  'reuters': 'reuters.com', 'bloomberg': 'bloomberg.com', 'al jazeera': 'aljazeera.com', 'bbc': 'bbc.com',
  'nikkei': 'asia.nikkei.com', 'south china morning post': 'scmp.com', 'the diplomat': 'thediplomat.com',
  'financial times': 'ft.com', 'anadolu': 'aa.com.tr', 'the express tribune': 'tribune.com.pk', 'dawn': 'dawn.com',
  'the print': 'theprint.in', 'india today': 'indiatoday.in', 'ndtv': 'ndtv.com', 'the wire': 'thewire.in',
}
function domainForSource(src = '') {
  const s = cleanSource(src).toLowerCase()
  for (const [k, v] of Object.entries(SRC_DOMAIN)) if (s.includes(k)) return v
  return null
}
// Real publisher logo (DuckDuckGo icon service) with a coloured-initials fallback.
function SourceLogo({ source }) {
  const [err, setErr] = useState(false)
  const dom = domainForSource(source)
  if (dom && !err) return <img className="nc-av nc-logo" src={`https://icons.duckduckgo.com/ip3/${dom}.ico`} alt="" loading="lazy" onError={() => setErr(true)} />
  return <span className="nc-av" style={{ background: `hsl(${avatarHue(source || '')} 62% 46%)` }}>{initials(source)}</span>
}
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

// Sector-aware Do/Avoid templates for the always-available fallback brief, so
// the report never sits stuck on "loading" if the live backend is slow/asleep.
const PLAYBOOK = {
  trade: { do: ['Diversify export destinations and lock in preferential access before terms shift.', 'Engage the counterpart trade ministry early to shape the rule, not just react to it.'], avoid: ['Do not concentrate RMG exposure on a single market or buyer bloc.', 'Avoid retaliatory signalling that invites tariff escalation.'] },
  security: { do: ['Reinforce border coordination and keep de-escalation channels open.', 'Brief the relevant force command and pre-position for a measured posture.'], avoid: ['Do not mirror provocations; avoid unilateral moves that narrow options.', 'Avoid public commitments that foreclose negotiation.'] },
  water: { do: ['Press for data-sharing and a joint dry-season flow schedule.', 'Prepare irrigation contingencies for affected districts now.'], avoid: ['Do not let the file drift; avoid ceding the technical framing.'] },
  energy: { do: ['Hedge supply with diversified LNG/fuel contracts and buffer stock.', 'Coordinate on transit and pricing before the next demand peak.'], avoid: ['Avoid single-supplier dependence on any one partner.'] },
  diplomacy: { do: ['Use the opening to broaden cooperation across multiple files.', 'Keep messaging neutral and interest-based toward all partners.'], avoid: ['Do not be drawn into bloc alignment that costs leverage elsewhere.'] },
  labour: { do: ['Protect worker channels and negotiate recruitment terms actively.', 'Track remittance corridors for any disruption.'], avoid: ['Avoid over-reliance on a single destination labour market.'] },
  climate: { do: ['Raise disaster-response asset readiness ahead of the season.', 'Coordinate early-warning with regional partners.'], avoid: ['Do not defer coastal-preparedness spending.'] },
}
function fallbackBrief(scored, t) {
  const sectors = scored.event.sectors || []
  const pb = PLAYBOOK[sectors[0]] || PLAYBOOK.diplomacy
  const actors = (scored.event.actors || []).filter((a) => a !== 'Bangladesh').join(', ') || 'the parties involved'
  return {
    refused: false, _fallback: true,
    why_it_matters: `Assessed against today's live situation: this ${sectors.join('/') || 'geopolitical'} development involving ${actors} scores ${Math.round(scored.relevance_score)}/100 (${scored.severity.toUpperCase()}) for Bangladesh. It should be read alongside the current live feed — what these partners are doing right now — rather than in isolation.`,
    do: pb.do.map((action) => ({ action })),
    avoid: pb.avoid.map((action) => ({ action })),
    decision_window: scored.severity === 'red' ? 'Hours to a few days — active decision window.' : scored.severity === 'amber' ? 'Roughly 30–90 days — act within the current staff cycle.' : 'No immediate deadline — monitor and revisit.',
    evidence: scored.evidence || [],
    meta: { confidence: 0.5, confidence_label: 'medium', model_version: 'drishti-doavoid-fallback/0.1' },
  }
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
  const [country, setCountry] = useState(null)   // set by clicking the world map
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
    // INSTANT: show a grounded Do/Avoid brief immediately (no waiting), then
    // quietly upgrade it with the live LLM analysis when it arrives.
    setBrief(fallbackBrief(sel, t))
    setBriefLoading(true)
    api.brief(sel.event.id, lang)
      .then((b) => { if (alive && b && !b.refused && (b.do?.length || b.why_it_matters)) setBrief(b) })
      .catch(() => {})
      .finally(() => { if (alive) setBriefLoading(false) })
    return () => { alive = false }
  }, [sel, lang])

  function openReport(s) {
    setSel(s)
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const events = data?.events || []
  const matchCountry = (s) => !country || (s.event.actors || []).some((a) => { const k = a.toLowerCase(); return k === country || k.includes(country) || country.includes(k) })
  const shown = events.filter((s) => (!sector || s.event.sectors.includes(sector)) && (!severity || s.severity === severity) && matchCountry(s))
  const countryLabel = country ? country.replace(/\b\w/g, (c) => c.toUpperCase()) : ''

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

  // Per-day series for KPI sparklines (real breakdown by event date).
  const spark = useMemo(() => {
    const days = {}
    events.forEach((s) => {
      const d = s.event.event_date
      const b = days[d] || (days[d] = { t: 0, red: 0, amber: 0, act: new Set() })
      b.t++; if (s.severity === 'red') b.red++; if (s.severity === 'amber') b.amber++
      ;(s.event.actors || []).forEach((a) => a !== 'Bangladesh' && b.act.add(a))
    })
    const keys = Object.keys(days).sort()
    return {
      total: keys.map((k) => days[k].t), red: keys.map((k) => days[k].red),
      amber: keys.map((k) => days[k].amber), actors: keys.map((k) => days[k].act.size),
    }
  }, [events])
  const deltaOf = (a) => (a.length >= 2 ? a[a.length - 1] - a[a.length - 2] : null)

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
          <KpiCard icon={Newspaper} label={t.totalEvents} value={events.length} spark={spark.total} delta={deltaOf(spark.total)} tone="blue" />
          <KpiCard icon={AlertTriangle} label={t.redAlerts} value={sevCounts.red} spark={spark.red} delta={deltaOf(spark.red)} tone="red" />
          <KpiCard icon={Bell} label={t.amberAlerts} value={sevCounts.amber} spark={spark.amber} delta={deltaOf(spark.amber)} tone="amber" />
          <KpiCard icon={Users} label={t.countriesInPlay} value={topActors.length} spark={spark.actors} delta={deltaOf(spark.actors)} tone="violet" />
        </div>
        <div className="panel bento-map accent-cyan">
          <div className="mini-title"><Globe2 size={15} className="ti" /> {t.geoFootprint}<span className="pnl-tag">{t.liveArcs}</span></div>
          <EventWorldMap events={events} onSelectCountry={setCountry} selectedCountry={country} />
        </div>
        <div className="bento-charts">
          <div className="panel bento-actors accent-violet">
            <div className="mini-title"><Radio size={15} className="ti" /> {t.topActors}</div>
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
          <div className="panel accent-blue"><div className="mini-title"><PieChart size={15} className="ti" /> {t.bySector}</div><SectorDonut data={sectorData} /></div>
          <div className="panel accent-red"><div className="mini-title"><PieChart size={15} className="ti" /> {t.bySeverity}</div><SeverityDonut counts={sevCounts} /></div>
        </div>
      </div>

      {/* Early-warning + region focus */}
      <div className="ew-region">
        <EarlyWarning events={events} onOpen={openReport} t={t} />
        <RegionFocus events={events} t={t} />
      </div>

      {/* Signal analytics — colourful pie + bar + trend */}
      <div className="section-title"><BarChart3 size={17} className="ti" /> {t.analytics}</div>
      <div className="analytics-grid">
        <div className="panel accent-green"><div className="mini-title"><Smile size={15} className="ti" /> {t.sentiment}</div><SentimentBar events={events} /></div>
        <div className="panel accent-violet"><div className="mini-title"><Radio size={15} className="ti" /> {t.actorVolume}</div><ActorBar actors={topActors} /></div>
        <div className="panel accent-cyan"><div className="mini-title"><LineChart size={15} className="ti" /> {t.signalVolume}</div><DayTrend events={events} /></div>
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
              {brief && !brief.refused && (
                <>
                  <div className="rt-note"><Satellite size={13} className="ti" /> {t.realtimeNote}{briefLoading ? <span className="enrich"> · {t.enriching}</span> : (brief._fallback ? '' : ` · ${t.liveContext}`)}</div>
                  <div className="why" style={{ marginTop: 10 }}><strong>{t.whyItMatters}:</strong> {brief.why_it_matters}</div>
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

      {/* Trending now */}
      {events.length > 0 && (
        <div className="trending">
          <span className="trend-tag"><Flame size={14} className="ti" /> {t.trending}</span>
          {[...events].sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 3).map((s, i) => (
            <button key={s.event.id} className={`trend-chip sel-${s.severity}`} onClick={() => openReport(s)}>
              <b>#{i + 1}</b> {s.event.title}<span className="tc-score">{Math.round(s.relevance_score)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Live Intelligence Feed — the news wall */}
      <div className="section-title feed-title">
        <Newspaper size={17} className="ti" /> {t.liveNews}
        <span className="realbadge">{shown.length} {t.totalEvents.toLowerCase()}</span>
        {country && <button className="filter-chip" onClick={() => setCountry(null)}>🌐 {t.filteredBy}: {countryLabel} ✕</button>}
        <span className="poll-note">⟳ {t.autoPolling}</span>
      </div>
      <div className="cat-tabs">
        {[''].concat(SECTORS).map((s) => (
          <button key={s || 'all'} className={`cat-tab ${sector === s ? 'on' : ''}`} onClick={() => setSector(s)}
            style={s && sector === s ? { borderColor: sectorColor(s), color: sectorColor(s) } : undefined}>
            {s || t.allNews}
          </button>
        ))}
        <div className="sev-mini">
          {[''].concat(SEVERITIES).map((s) => (
            <button key={s || 'allsev'} className={`sevpill ${severity === s ? 'on' : ''} ${s ? 'sv-' + s : ''}`} onClick={() => setSeverity(s)}>
              {s || t.allSeverities}
            </button>
          ))}
        </div>
      </div>

      {!data && <div className="loading">{t.loading}</div>}
      <div className="news-wall">
        {shown.map((s) => {
          const sent = sentimentOf(s.event)
          return (
            <article key={s.event.id} className={`news-card sel-${s.severity} ${sel?.event.id === s.event.id ? 'active' : ''}`} onClick={() => openReport(s)}>
              <div className="nc-top">
                <SourceLogo source={s.event.source} />
                <div className="nc-src">
                  <b>{cleanSource(s.event.source)}</b>
                  <span>{daysAgo(s.event.event_date, t)}</span>
                </div>
                <div className={`nc-score sev-${s.severity}`}>{Math.round(s.relevance_score)}</div>
              </div>
              <h3 className="nc-title">{s.event.title}</h3>
              <div className="nc-tags">
                <span className={`nc-sent ${sent.k}`}>{sentLabel(sent.k, t)}</span>
                {s.event.sectors.slice(0, 3).map((x) => <span className="chip" key={x} style={{ borderColor: sectorColor(x) }}>{x}</span>)}
                {s.event.actors.filter((a) => a !== 'Bangladesh').slice(0, 2).map((a) => <span className="nc-actor" key={a}>{a}</span>)}
              </div>
              <div className="nc-foot">
                <span className={`nc-band sev-${s.severity}`} />
                <span className="nc-open">{t.openBrief} →</span>
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
