import { useEffect, useState } from 'react'
import { useStrings } from './i18n.js'
import DrishtiView from './modules/DrishtiView.jsx'
import RakkhokView from './modules/RakkhokView.jsx'
import ShomudroView from './modules/ShomudroView.jsx'

const MODULES = [
  { key: 'drishti', bn: 'দৃষ্টি' },
  { key: 'rakkhok', bn: 'রক্ষক' },
  { key: 'shomudro', bn: 'সমুদ্র' },
]

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

      <main className="main">
        {active === 'drishti' && <DrishtiView lang={lang} />}
        {active === 'rakkhok' && <RakkhokView lang={lang} />}
        {active === 'shomudro' && <ShomudroView lang={lang} />}
      </main>
    </div>
  )
}
