import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useStrings } from '../i18n.js'
import EquipmentIcon from '../components/EquipmentIcon.jsx'
import EvidenceChain from '../components/EvidenceChain.jsx'
import KpiCard from '../components/KpiCard.jsx'
import { Gauge, CheckCircle2, Wrench, AlertOctagon, Bell, ShieldAlert } from 'lucide-react'

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
function alertColor(a) {
  return a === 'red' ? 'var(--red)' : a === 'amber' ? 'var(--amber)' : 'var(--green)'
}

// Small SVG ring gauge for the digital-twin header.
function Ring({ pct, color, big, unit }) {
  const r = 26, c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(1, pct / 100)))
  return (
    <svg className="ring" viewBox="0 0 64 64" width="72" height="72">
      <circle cx="32" cy="32" r={r} className="ring-track" />
      <circle cx="32" cy="32" r={r} stroke={color} strokeDasharray={c} strokeDashoffset={off}
        strokeLinecap="round" fill="none" strokeWidth="6" transform="rotate(-90 32 32)" />
      <text x="32" y="34" className="ring-val" style={{ fontSize: big ? 15 : 13 }}>{big}</text>
      {unit && <text x="32" y="45" className="ring-unit">{unit}</text>}
    </svg>
  )
}

// Window badge for a calendar clock: 30 / 90 / 180-day proximity.
function windowBadge(clock, t) {
  if (clock.remaining_kind !== 'days' || clock.remaining == null) return null
  const d = clock.remaining
  if (d <= 30) return <span className="win-badge w30">{t.within30}</span>
  if (d <= 90) return <span className="win-badge w90">{t.within90}</span>
  if (d <= 180) return <span className="win-badge w180">{t.within180}</span>
  return null
}

function recommendations(h, t) {
  const doNow = [], watch = []
  const w = h.worst_clock, fp = h.failure_probability_90d, rul = h.rul_days
  if (fp >= 0.6) doNow.push(`Treat as failure-imminent — pre-position spares and crew for ${w?.label || 'the critical system'}.`)
  if (w?.alert === 'red' || rul <= 30) doNow.push(`Induct into depot maintenance now for ${w?.label || 'service'} (RUL ${Math.round(rul)} ${t.days}).`)
  ;(h.asset.clocks || []).forEach((c) => {
    if (c.alert === 'amber') watch.push(`Book ${c.label} inside the 90-day window (${c.remaining} ${c.remaining_kind} left).`)
  })
  if (!doNow.length) doNow.push(`Sustain normal servicing cycle; no immediate depot action required.`)
  return { doNow, watch }
}

// RAKKHOK — Fleet Health Dashboard (R1) + RUL ranking (R3) + digital-twin report.
export default function RakkhokView({ lang }) {
  const t = useStrings(lang)
  const [readiness, setReadiness] = useState(null)
  const [ranking, setRanking] = useState([])
  const [alerts, setAlerts] = useState([])
  const [sel, setSel] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([api.readiness(), api.rulRanking(10), api.fleetAlerts()])
      .then(([r, rk, al]) => { if (alive) { setReadiness(r); setRanking(rk); setAlerts(al) } })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!readiness) return <div className="loading">{t.loading}</div>
  const o = readiness.overall
  // Real per-force values reshaped as KPI sparklines (not synthetic).
  const forceSpark = {
    ready: readiness.by_force.map((f) => f.readiness_pct),
    op: readiness.by_force.map((f) => f.operational),
    maint: readiness.by_force.map((f) => Math.max(0, f.total - f.operational - f.grounded)),
    gnd: readiness.by_force.map((f) => f.grounded),
  }

  return (
    <div>
      {/* Readiness KPI cards */}
      <div className="section-title"><Gauge size={17} className="ti" /> {t.fleetReadiness}</div>
      <div className="kpi-row">
        <KpiCard icon={Gauge} label={t.readinessPct} value={o.readiness_pct} unit="%" tone={o.readiness_pct >= 80 ? 'green' : o.readiness_pct >= 60 ? 'amber' : 'red'} spark={forceSpark.ready} />
        <KpiCard icon={CheckCircle2} label={t.operational} value={o.operational} tone="green" spark={forceSpark.op} />
        <KpiCard icon={Wrench} label={t.maintenance} value={o.maintenance} tone="amber" spark={forceSpark.maint} />
        <KpiCard icon={AlertOctagon} label={t.grounded} value={o.grounded} tone="red" spark={forceSpark.gnd} />
        <KpiCard icon={ShieldAlert} label={t.redAlerts} value={readiness.red_alerts} tone="red" />
        <KpiCard icon={Bell} label={t.amberAlerts} value={readiness.amber_alerts} tone="amber" />
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

      <div className="two-col rk-col">
        {/* RUL ranking (R3) — modern table, click a row for the report */}
        <section className="panel table-card">
          <div className="section-title"><ShieldAlert size={17} className="ti" /> {t.rulRanking}</div>
          <div className="mtable-wrap">
            <table className="mtable">
              <thead>
                <tr>
                  <th>{t.contactType ? 'Asset' : 'Asset'}</th>
                  <th className="hide-sm">{t.force}</th>
                  <th>{t.status || 'Status'}</th>
                  <th>{t.failureRisk}</th>
                  <th className="ta-r">{t.rul}</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((h) => {
                  const fp = Math.round(h.failure_probability_90d * 100)
                  return (
                    <tr key={h.asset.id} className={sel?.asset.id === h.asset.id ? 'on' : ''} onClick={() => setSel(h)}>
                      <td>
                        <div className="mt-asset">
                          <span className={`mt-av st-${h.computed_status}`}><EquipmentIcon type={h.asset.type} size={26} /></span>
                          <div className="mt-nm"><b>{h.asset.name}</b><span>{h.asset.type}</span></div>
                        </div>
                      </td>
                      <td className="hide-sm"><span className="mt-force">{h.asset.force.replace('_', ' ')}</span></td>
                      <td><span className={`pill st-${h.computed_status}`}>{t[h.computed_status] || h.computed_status}</span></td>
                      <td>
                        <div className="mt-risk">
                          <div className="bar"><span style={{ width: `${fp}%`, background: riskColor(h.failure_probability_90d) }} /></div>
                          <b style={{ color: riskColor(h.failure_probability_90d) }}>{fp}%</b>
                        </div>
                      </td>
                      <td className="ta-r"><b className="mt-rul">{Math.round(h.rul_days)}</b><span className="mt-d"> {t.days}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Digital-twin asset health report */}
        <section>
          <div className="section-title">{t.assetReport}</div>
          {!sel ? (
            <div className="panel hud"><div className="placeholder">{t.selectAsset}</div></div>
          ) : (
            <AssetReport h={sel} t={t} />
          )}
        </section>
      </div>

      {/* Service-life alerts (R2) */}
      <section className="panel" style={{ marginTop: 4 }}>
        <div className="section-title">{t.serviceLifeAlerts} ({alerts.length})</div>
        <div className="alert-grid">
          {alerts.map((a, i) => (
            <div className="alert-row" key={i}>
              <span className={`lvl lvl-${a.level}`} />
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AssetReport({ h, t }) {
  const a = h.asset
  const missionPct = h.computed_status === 'operational' ? 100 : h.computed_status === 'maintenance' ? 50 : 0
  const rulPct = Math.min(100, (h.rul_days / 365) * 100)
  const fpPct = Math.round(h.failure_probability_90d * 100)
  const { doNow, watch } = recommendations(h, t)
  const age = 2026 - a.induction_year

  return (
    <div className="panel hud report asset-report">
      <div className="ar-head">
        <div className={`ar-photo st-${h.computed_status}`}><EquipmentIcon type={a.type} size={82} /></div>
        <div className="ar-id">
          <h2>{a.name}</h2>
          <div className="ar-type">{a.type}</div>
          <div className="ar-meta">
            <span className={`status-pill st-${h.computed_status}`}>{t[h.computed_status] || h.computed_status}</span>
            <span className="chip">{a.force.replace('_', ' ')}</span>
            <span className="chip">{a.base}</span>
          </div>
        </div>
      </div>

      <div className="mini-title">{t.healthAnalysis}</div>
      <div className="gauges">
        <div className="gauge"><Ring pct={missionPct} color={pctColor(missionPct)} big={`${missionPct}%`} />
          <div className="glabel">{t.missionCap}</div></div>
        <div className="gauge"><Ring pct={rulPct} color={rulPct > 50 ? 'var(--green)' : rulPct > 20 ? 'var(--amber)' : 'var(--red)'} big={Math.round(h.rul_days)} unit={t.days} />
          <div className="glabel">{t.remainingLife} <em>({t.predicted})</em></div></div>
        <div className="gauge"><Ring pct={fpPct} color={riskColor(h.failure_probability_90d)} big={`${fpPct}%`} />
          <div className="glabel">{t.failureRisk}</div></div>
      </div>

      <div className="ar-facts">
        <div><span>{t.commissioned}</span><b>{a.induction_year} · {age} yr</b></div>
        <div><span>{t.serviceLife}</span><b>{a.design_life_years} yr</b></div>
        {a.usage?.airframe_hours != null && <div><span>{t.hoursLogged}</span><b>{a.usage.airframe_hours.toLocaleString()} h</b></div>}
        {a.usage?.util_per_day != null && <div><span>Util/day</span><b>{a.usage.util_per_day}</b></div>}
      </div>

      <div className="mini-title" style={{ marginTop: 14 }}>{t.serviceCountdown}</div>
      <div className="clocks">
        {(a.clocks || []).map((c, i) => (
          <div className="clock-row" key={i}>
            <div className="clabel">{c.label} {windowBadge(c, t)}</div>
            <div className="bar"><span style={{ width: `${Math.round(c.pct_consumed * 100)}%`, background: alertColor(c.alert) }} /></div>
            <div className="crem">{c.remaining != null ? `${c.remaining} ${c.remaining_kind} ${t.remainingLife.toLowerCase()}` : '—'}{c.limit ? ` · ${c.current}/${c.limit}${c.unit ? ' ' + c.unit : ''}` : ''}</div>
          </div>
        ))}
      </div>

      <div className="mini-title" style={{ marginTop: 14 }}>{t.maintRec}</div>
      <div className="doavoid">
        <div className="col-do"><h3>✔ {t.doNow}</h3>{doNow.map((r, i) => <div className="rec" key={i}>{r}</div>)}</div>
        <div className="col-avoid" style={{ borderColor: 'var(--amber)' }}><h3 style={{ color: 'var(--amber)' }}>👁 {t.watch}</h3>
          {watch.length ? watch.map((r, i) => <div className="rec" key={i}>{r}</div>) : <div className="rec">—</div>}</div>
      </div>

      <EvidenceChain meta={h.meta} evidence={h.evidence} label={t.evidenceBasis} />
    </div>
  )
}
