import { useEffect, useState } from 'react'
import { useStrings } from './i18n.js'
import DrishtiView from './modules/DrishtiView.jsx'
import RakkhokView from './modules/RakkhokView.jsx'
import ShomudroView from './modules/ShomudroView.jsx'
import NationalView from './modules/NationalView.jsx'

const MODULES = [
  { key: 'drishti', bn: 'দৃষ্টি', icon: '🛰️' },
  { key: 'rakkhok', bn: 'রক্ষক', icon: '🛡️' },
  { key: 'shomudro', bn: 'সমুদ্র', icon: '🌊' },
]

export default function App() {
  const [lang, setLang] = useState('en')
  const [active, setActive] = useState('drishti')
  const [theme, setTheme] = useState('dark')   // dark command-center by default
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
          {/* National Situation — its own page, reached by this button */}
          <button className={`module-tab nat-btn ${active === 'national' ? 'active' : ''}`} onClick={() => setActive('national')}>
            🇧🇩 {t.nationalSituation}
          </button>
          <span className="nav-div" />
          {MODULES.map((m) => (
            <button
              key={m.key}
              className={`module-tab ${active === m.key ? 'active' : ''}`}
              onClick={() => setActive(m.key)}
            >
              <span className="mt-ic">{m.icon}</span>{lang === 'bn' ? m.bn : t.modules[m.key]}
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

      <main className="main">
        {active === 'national' && <NationalView lang={lang} go={setActive} />}
        {active === 'drishti' && <DrishtiView lang={lang} />}
        {active === 'rakkhok' && <RakkhokView lang={lang} />}
        {active === 'shomudro' && <ShomudroView lang={lang} />}
      </main>
    </div>
  )
}
