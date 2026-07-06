import EvidenceChain from './EvidenceChain.jsx'

// D4 — the Do/Avoid Advisor brief for a selected event.
export default function BriefPanel({ brief, loading, t }) {
  if (loading) return <div className="loading">{t.loading}</div>
  if (!brief) return <div className="placeholder">{t.selectEvent}</div>

  if (brief.refused) {
    return (
      <div className="brief">
        <h2>{brief.title}</h2>
        <div className="refused">
          <strong>⚠ {t.refused}.</strong> {brief.refusal_reason}
        </div>
        <EvidenceChain meta={brief.meta} evidence={brief.evidence} label={t.confidence} />
      </div>
    )
  }

  return (
    <div className="brief">
      <h2>{brief.title}</h2>
      <div className="sit"><strong>{t.situation}:</strong> {brief.situation}</div>
      <div className="why"><strong>{t.whyItMatters}:</strong> {brief.why_it_matters}</div>

      <div className="doavoid">
        <div className="col-do">
          <h3>✔ {t.doColumn}</h3>
          {brief.do.map((r, i) => (
            <div className="rec" key={i}>
              {r.action}
              {r.citations?.length > 0 && <span className="cite">⧉ {r.citations.join(', ')}</span>}
            </div>
          ))}
        </div>
        <div className="col-avoid">
          <h3>✕ {t.avoidColumn}</h3>
          {brief.avoid.map((r, i) => (
            <div className="rec" key={i}>
              {r.action}
              {r.citations?.length > 0 && <span className="cite">⧉ {r.citations.join(', ')}</span>}
            </div>
          ))}
        </div>
      </div>

      {brief.hedges?.length > 0 && (
        <div className="rec" style={{ marginTop: 12 }}>
          <strong>{t.hedges}:</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
            {brief.hedges.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </div>
      )}

      <div className="window">⏱ {t.decisionWindow}: {brief.decision_window}</div>
      <EvidenceChain meta={brief.meta} evidence={brief.evidence} label={t.confidence} />
    </div>
  )
}
