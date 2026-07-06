// Reusable explainability surface (design law #3): confidence band + the
// expandable evidence list attached to every AI output.
export default function EvidenceChain({ meta, evidence, label }) {
  if (!meta) return null
  const band = meta.confidence_label || 'medium'
  const pct = Math.round((meta.confidence ?? 0) * 100)
  return (
    <div className="evidence">
      <div className={`confidence conf-${band}`}>
        <span className="dot" />
        {(label || 'Confidence')}: {band} ({pct}%) · {meta.model_version}
      </div>
      {evidence && evidence.length > 0 && (
        <details>
          <summary>{`Evidence (${evidence.length})`}</summary>
          <ul>
            {evidence.map((e, i) => (
              <li key={i}>
                <strong>{e.source}:</strong> {e.detail}
                {e.url && (
                  <>
                    {' '}
                    <a href={e.url} target="_blank" rel="noreferrer">↗</a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
