import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'
import BriefPanel from '../components/BriefPanel.jsx'
import AskPrahari from '../components/AskPrahari.jsx'

const SECTORS = ['trade', 'labour', 'security', 'water', 'energy', 'diplomacy', 'climate']
const SEVERITIES = ['red', 'amber', 'green']

// DRISHTI — geopolitical intelligence view: Global Event Radar (D1) +
// Do/Avoid Advisor (D4) + Ask-PRAHARI (C2), all sharing the selected event.
export default function DrishtiView({ lang }) {
  const t = useStrings(lang)
  const [data, setData] = useState(null)
  const [sector, setSector] = useState('')
  const [severity, setSeverity] = useState('')
  const [selected, setSelected] = useState(null)
  const [brief, setBrief] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)

  // Load the ranked event radar (re-runs when filters change).
  useEffect(() => {
    let alive = true
    api.events({ sector, severity }).then((d) => alive && setData(d)).catch(() => {})
    return () => { alive = false }
  }, [sector, severity])

  // Fetch the brief for the selected event (re-runs when language changes).
  useEffect(() => {
    if (!selected) { setBrief(null); return }
    let alive = true
    setBriefLoading(true)
    api.brief(selected, lang)
      .then((b) => alive && setBrief(b))
      .catch(() => alive && setBrief(null))
      .finally(() => alive && setBriefLoading(false))
    return () => { alive = false }
  }, [selected, lang])

  return (
    <div className="two-col">
      {/* Left: Global Event Radar (D1) */}
      <section>
        <div className="section-title">{t.eventRadar}</div>
        <div className="filters">
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">{t.allSectors}</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">{t.allSeverities}</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {data && !data.live_source && <span className="banner">· cached snapshot</span>}
        </div>

        {!data && <div className="loading">{t.loading}</div>}
        {data?.events.map(({ event, relevance_score, severity: sev }) => (
          <div
            key={event.id}
            className={`event-card sel-${sev} ${selected === event.id ? 'active' : ''}`}
            onClick={() => setSelected(event.id)}
          >
            <div className="event-head">
              <div>
                <div className="event-title">{event.title}</div>
                <div className="event-meta">
                  <span>{event.event_date}</span>
                  {event.actors.slice(0, 3).map((a) => <span className="chip" key={a}>{a}</span>)}
                  {event.sectors.map((s) => <span className="chip" key={s}>{s}</span>)}
                </div>
              </div>
              <div className={`score sev-${sev}`}>
                {Math.round(relevance_score)}
                <small>{t.relevance}</small>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Right: Do/Avoid Advisor (D4) + Ask-PRAHARI (C2) */}
      <section>
        <div className="section-title">{t.doAvoid}</div>
        <div className="panel">
          <BriefPanel brief={brief} loading={briefLoading} t={t} />
        </div>
        <AskPrahari lang={lang} t={t} />
      </section>
    </div>
  )
}
