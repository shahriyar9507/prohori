import { useEffect, useState } from 'react'
import { useStrings } from './i18n.js'
import { api } from './api.js'
import DrishtiView from './modules/DrishtiView.jsx'
import RakkhokView from './modules/RakkhokView.jsx'
import ShomudroView from './modules/ShomudroView.jsx'

const MODULES = [
  { key: 'drishti', bn: 'দৃষ্টি' },
  { key: 'rakkhok', bn: 'রক্ষক' },
  { key: 'shomudro', bn: 'সমুদ্র' },
]

// C1 — unified National Situation strip: one glance across all three modules,
// each tile jumps to its module. Reads the same live/baked data the modules use.
function NationalStrip({ t, go, active }) {
  const [red, setRed] = useState(null)
  const [ready, setReady] = useState(null)
  const [dark, setDark] = useState(null)

  useEffect(() => {
    let alive = true
    api.events().then((d) => alive && setRed((d.events || []).filter((s) => s.severity === 'red').length)).catch(() => {})
    api.eventsLive?.().then((l) => { if (alive && l?.events) setRed(l.events.filter((s) => s.severity === 'red').length) }).catch(() => {})
    api.readiness().then((r) => alive && setReady(r.overall.readiness_pct)).catch(() => {})
    api.picture().then((p) => alive && setDark(p.counts?.dark ?? 0)).catch(() => {})
    return () => { alive = false }
  }, [])

  const posture = (lvl) => (lvl === 2 ? t.high2 : lvl === 1 ? t.elevated : t.calm)
  const diploLvl = red == null ? 0 : red >= 3 ? 2 : red >= 1 ? 1 : 0
  const readyLvl = ready == null ? 0 : ready >= 80 ? 0 : ready >= 60 ? 1 : 2
  const darkLvl = dark == null ? 0 : dark >= 40 ? 2 : dark >= 10 ? 1 : 0
  const cls = (lvl) => (lvl === 2 ? 'ns-red' : lvl === 1 ? 'ns-amber' : 'ns-green')

  return (
    <div className="natstrip">
      <div className="ns-title"><i className="ns-dot" /> {t.nationalSituation}<small>{t.across3}</small></div>
      <div className="ns-cards">
        <button className={`ns-card ${cls(diploLvl)} ${active === 'drishti' ? 'on' : ''}`} onClick={() => go('drishti')}>
          <div className="ns-k">{t.diploPressure}</div>
          <div className="ns-v">{red ?? '—'} <span>{t.redAlerts.toLowerCase()}</span></div>
          <div className="ns-p">{posture(diploLvl)}</div>
        </button>
        <button className={`ns-card ${cls(readyLvl)} ${active === 'rakkhok' ? 'on' : ''}`} onClick={() => go('rakkhok')}>
          <div className="ns-k">{t.fleetReady}</div>
          <div className="ns-v">{ready ?? '—'}<span>%</span></div>
          <div className="ns-p">{posture(readyLvl)}</div>
        </button>
        <button className={`ns-card ${cls(darkLvl)} ${active === 'shomudro' ? 'on' : ''}`} onClick={() => go('shomudro')}>
          <div className="ns-k">{t.maritimeThreat}</div>
          <div className="ns-v">{dark ?? '—'} <span>{t.darkContacts.toLowerCase()}</span></div>
          <div className="ns-p">{posture(darkLvl)}</div>
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [lang, setLang] = useState('en')
  const [active, setActive] = useState('drishti')
  const [theme, setTheme] = useState('light')   // white mode first
  const t = useStrings(lang)

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])

  return (
    <div className={`app ${lang === 'bn' ? 'lang-bn' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <div className="mark">🛡️</div>
          <h1>PRAHARI</h1>
          <span className="tag">{t.tagline}</span>
        </div>

        <nav className="modules">
          {MODULES.map((m) => (
            <button
              key={m.key}
              className={`module-tab ${active === m.key ? 'active' : ''}`}
              onClick={() => setActive(m.key)}
            >
              {lang === 'bn' ? m.bn : t.modules[m.key]}
            </button>
          ))}
        </nav>

        <div className="controls">
          <span className="status-live"><i />LIVE</span>
          <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div className="lang-toggle">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'bn' ? 'active' : ''} onClick={() => setLang('bn')}>বাং</button>
          </div>
        </div>
      </header>

      <NationalStrip t={t} go={setActive} active={active} />

      <main className="main">
        {active === 'drishti' && <DrishtiView lang={lang} />}
        {active === 'rakkhok' && <RakkhokView lang={lang} />}
        {active === 'shomudro' && <ShomudroView lang={lang} />}
      </main>
    </div>
  )
}
