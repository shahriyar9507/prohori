import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'

function riskColor(p) {
  if (p >= 0.6) return 'var(--red)'
  if (p >= 0.3) return 'var(--amber)'
  return 'var(--green)'
}
function pctColor(p) {
  if (p >= 80) return 'var(--green)'
  if (p >= 60) return 'var(--amber)'
  return 'var(--red)'
}

// RAKKHOK — Fleet Health Dashboard (R1) + RUL ranking (R3) + alerts (R2).
export default function RakkhokView({ lang }) {
  const t = useStrings(lang)
  const [readiness, setReadiness] = useState(null)
  const [ranking, setRanking] = useState([])
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    let alive = true
    Promise.all([api.readiness(), api.rulRanking(8), api.fleetAlerts()])
      .then(([r, rk, al]) => { if (alive) { setReadiness(r); setRanking(rk); setAlerts(al) } })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!readiness) return <div className="loading">{t.loading}</div>
  const o = readiness.overall

  return (
    <div>
      {/* Big-number readiness tiles */}
      <div className="section-title">{t.fleetReadiness}</div>
      <div className="tiles">
        <div className="tile readiness">
          <div className="num" style={{ color: pctColor(o.readiness_pct) }}>{o.readiness_pct}%</div>
          <div className="lbl">{t.readinessPct}</div>
        </div>
        <div className="tile ok"><div className="num">{o.operational}</div><div className="lbl">{t.operational}</div></div>
        <div className="tile warn"><div className="num">{o.maintenance}</div><div className="lbl">{t.maintenance}</div></div>
        <div className="tile bad"><div className="num">{o.grounded}</div><div className="lbl">{t.grounded}</div></div>
        <div className="tile bad"><div className="num">{readiness.red_alerts}</div><div className="lbl">{t.redAlerts}</div></div>
        <div className="tile warn"><div className="num">{readiness.amber_alerts}</div><div className="lbl">{t.amberAlerts}</div></div>
      </div>

      {/* Per-force readiness */}
      <div className="section-title">{t.byForce}</div>
      <div className="force-row">
        {readiness.by_force.map((f) => (
          <div className="force-card" key={f.scope}>
            <div className="fname">{f.scope.replace('_', ' ')}</div>
            <div className="fpct" style={{ color: pctColor(f.readiness_pct) }}>{f.readiness_pct}%</div>
            <div className="fsub">{f.operational}/{f.total} {t.operational.toLowerCase()} · {f.grounded} {t.grounded.toLowerCase()}</div>
            <div className="bar"><span style={{ width: `${f.readiness_pct}%`, background: pctColor(f.readiness_pct) }} /></div>
          </div>
        ))}
      </div>

      <div className="two-col">
        {/* RUL ranking (R3) */}
        <section className="panel">
          <div className="section-title">{t.rulRanking}</div>
          {ranking.map((h) => (
            <div className="rank-row" key={h.asset.id}>
              <span className={`status-pill st-${h.computed_status}`}>{t[h.computed_status] || h.computed_status}</span>
              <div className="rank-name">
                <div className="rn">{h.asset.name}</div>
                <div className="rt">{h.asset.type}</div>
              </div>
              <div className="risk">
                <div className="rlabel">
                  <span>{t.failureRisk}</span>
                  <span>{Math.round(h.failure_probability_90d * 100)}%</span>
                </div>
                <div className="bar">
                  <span style={{ width: `${Math.round(h.failure_probability_90d * 100)}%`, background: riskColor(h.failure_probability_90d) }} />
                </div>
                <div className="rt">{t.rul}: {Math.round(h.rul_days)} {t.days}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Service-life alerts (R2) */}
        <section className="panel">
          <div className="section-title">{t.serviceLifeAlerts} ({alerts.length})</div>
          {alerts.map((a, i) => (
            <div className="alert-row" key={i}>
              <span className={`lvl lvl-${a.level}`} />
              <span>{a.message}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
