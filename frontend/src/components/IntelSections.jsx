import { sectorColor } from './Charts.jsx'

const FLAG = {
  India: '🇮🇳', China: '🇨🇳', Myanmar: '🇲🇲', Pakistan: '🇵🇰', Nepal: '🇳🇵', 'Sri Lanka': '🇱🇰',
  'United States': '🇺🇸', 'European Union': '🇪🇺', 'Saudi Arabia': '🇸🇦', Japan: '🇯🇵', Russia: '🇷🇺',
  'United Arab Emirates': '🇦🇪', Qatar: '🇶🇦', Malaysia: '🇲🇾', Bangladesh: '🇧🇩',
}
const tone = (e) => e.goldstein ?? e.tone ?? 0

/* ── Early-warning board: alert meter + escalation watch ─────────────── */
export function EarlyWarning({ events, onOpen, t }) {
  const red = events.filter((s) => s.severity === 'red')
  const amber = events.filter((s) => s.severity === 'amber')
  const green = events.filter((s) => s.severity === 'green')
  const total = Math.max(1, events.length)
  const watch = [...red, ...amber].slice(0, 7)
  const level = red.length >= 3 ? { k: t.high2, c: 'var(--red)' } : red.length >= 1 ? { k: t.elevated, c: 'var(--amber)' } : { k: t.calm, c: 'var(--green)' }

  return (
    <div className="panel accent-red ew">
      <div className="mini-title">🚨 {t.earlyWarning}<span className="pnl-tag" style={{ color: level.c }}>{t.posture}: {level.k}</span></div>
      <div className="ew-meter">
        <span className="ewm red" style={{ width: `${(red.length / total) * 100}%` }} />
        <span className="ewm amber" style={{ width: `${(amber.length / total) * 100}%` }} />
        <span className="ewm green" style={{ width: `${(green.length / total) * 100}%` }} />
      </div>
      <div className="ew-legend">
        <span><i className="d red" />{red.length} {t.redAlerts.toLowerCase()}</span>
        <span><i className="d amber" />{amber.length} {t.amberAlerts.toLowerCase()}</span>
        <span><i className="d green" />{green.length} nominal</span>
      </div>
      <div className="ew-list">
        {watch.map((s) => (
          <button key={s.event.id} className={`ew-row sel-${s.severity}`} onClick={() => onOpen(s)}>
            <span className={`ew-dot sev-${s.severity}`} />
            <span className="ew-title">{s.event.title}</span>
            <span className="ew-score">{Math.round(s.relevance_score)}</span>
          </button>
        ))}
        {!watch.length && <div className="placeholder">{t.calm} ✓</div>}
      </div>
    </div>
  )
}

/* ── Region focus: South-Asia + partners country tiles ──────────────── */
export function RegionFocus({ events, t }) {
  const map = {}
  events.forEach((s) => (s.event.actors || []).forEach((a) => {
    if (a === 'Bangladesh' || !FLAG[a]) return
    const m = map[a] || (map[a] = { name: a, n: 0, tone: 0, top: null, topScore: -1 })
    m.n++; m.tone += tone(s.event)
    if (s.relevance_score > m.topScore) { m.topScore = s.relevance_score; m.top = s.event.title }
  }))
  const tiles = Object.values(map).sort((a, b) => b.n - a.n).slice(0, 8)
  const mood = (v) => (v > 1 ? { k: '▲', c: 'var(--green)' } : v < -1 ? { k: '▼', c: 'var(--red)' } : { k: '—', c: 'var(--text-dim)' })

  return (
    <div className="panel accent-teal">
      <div className="mini-title">🗺️ {t.regionFocus}<span className="pnl-tag">South Asia · partners</span></div>
      <div className="region-grid">
        {tiles.map((c) => {
          const m = mood(c.tone / c.n)
          return (
            <div className="region-tile" key={c.name}>
              <div className="rt-head"><span className="rt-flag">{FLAG[c.name]}</span><b>{c.name}</b><span className="rt-mood" style={{ color: m.c }}>{m.k}</span></div>
              <div className="rt-n">{c.n} <span>{t.countriesInPlay.toLowerCase().includes('সক্রিয়') ? 'সিগন্যাল' : 'signals'}</span></div>
              <div className="rt-top">{c.top}</div>
            </div>
          )
        })}
        {!tiles.length && <div className="placeholder">{t.loading}</div>}
      </div>
    </div>
  )
}
