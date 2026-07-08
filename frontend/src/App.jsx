import { useEffect, useState } from 'react'
import { useStrings } from './i18n.js'
import DrishtiView from './modules/DrishtiView.jsx'
import RakkhokView from './modules/RakkhokView.jsx'
import ShomudroView from './modules/ShomudroView.jsx'
import NationalView from './modules/NationalView.jsx'
import { Satellite, Shield, Waves, Flag, Moon, Sun, ShieldCheck } from 'lucide-react'

const MODULES = [
  { key: 'drishti', bn: 'দৃষ্টি', Icon: Satellite },
  { key: 'rakkhok', bn: 'রক্ষক', Icon: Shield },
  { key: 'shomudro', bn: 'সমুদ্র', Icon: Waves },
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
          <div className="mark"><ShieldCheck size={22} strokeWidth={2.4} /></div>
          <div className="brand-txt">
            <h1>PRAHARI <span className="brand-bn">প্রহরী</span></h1>
            <span className="tag">{t.tagline}</span>
          </div>
        </div>

        <nav className="modules">
          {/* National Situation — its own page, reached by this button */}
          <button className={`module-tab nat-btn ${active === 'national' ? 'active' : ''}`} onClick={() => setActive('national')}>
            <Flag size={15} className="mt-ic" />{t.nationalSituation}
          </button>
          <span className="nav-div" />
          {MODULES.map((m) => (
            <button
              key={m.key}
              className={`module-tab ${active === m.key ? 'active' : ''}`}
              onClick={() => setActive(m.key)}
            >
              <m.Icon size={15} className="mt-ic" />{lang === 'bn' ? m.bn : t.modules[m.key]}
            </button>
          ))}
        </nav>

        <div className="controls">
          <span className="status-live"><i />LIVE</span>
          <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title={theme === 'light' ? t.themeDark : t.themeLight}>
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
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
