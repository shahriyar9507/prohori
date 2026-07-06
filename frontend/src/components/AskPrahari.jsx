import { useState } from 'react'
import { api } from '../api.js'
import EvidenceChain from './EvidenceChain.jsx'

// C2 — Ask-PRAHARI bilingual Q&A over the DRISHTI feed.
export default function AskPrahari({ lang, t }) {
  const [q, setQ] = useState('')
  const [resp, setResp] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    try {
      setResp(await api.ask(q, lang))
    } catch (err) {
      setResp({ answer: String(err), evidence: [], meta: null })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ask panel">
      <div className="section-title">{t.ask}</div>
      <form className="ask-row" onSubmit={submit}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.askPlaceholder}
        />
        <button type="submit">{t.send}</button>
      </form>
      {loading && <div className="loading">{t.loading}</div>}
      {resp && !loading && (
        <div className="answer">
          {resp.answer}
          <EvidenceChain meta={resp.meta} evidence={resp.evidence} label={t.confidence} />
        </div>
      )}
    </div>
  )
}
