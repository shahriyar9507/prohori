import { useState } from 'react'
import { useStrings } from './i18n.js'

const MODULES = [
  { key: 'drishti', bn: 'দৃষ্টি' },
  { key: 'rakkhok', bn: 'রক্ষক' },
  { key: 'shomudro', bn: 'সমুদ্র' },
]

export default function App() {
  const [lang, setLang] = useState('en')
  const [active, setActive] = useState('drishti')
  const t = useStrings(lang)

  return (
    <div className={`app ${lang === 'bn' ? 'lang-bn' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <h1>🛡️ PRAHARI</h1>
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
          <div className="lang-toggle">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'bn' ? 'active' : ''} onClick={() => setLang('bn')}>বাং</button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="placeholder">
          {t.modules[active]} — {t.comingSoon}
        </div>
      </main>
    </div>
  )
}
