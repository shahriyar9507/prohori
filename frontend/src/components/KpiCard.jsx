import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

// Tone → colour token used for the icon chip and sparkline.
const TONE = {
  blue: '#3987e5', cyan: '#22d3ee', red: '#ff4d6a', amber: '#f59e0b',
  green: '#22c39a', violet: '#8b7cf6', teal: '#14b8a6',
}

function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf, start
    const step = (ts) => { if (!start) start = ts; const p = Math.min(1, (ts - start) / ms); setV(target * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

// Tiny inline sparkline (area + line) — no chart lib overhead.
function Spark({ data, color }) {
  if (!data || data.length < 2) return <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" />
  const max = Math.max(...data), min = Math.min(...data)
  const rng = max - min || 1
  const step = 100 / (data.length - 1)
  const pts = data.map((d, i) => [i * step, 30 - ((d - min) / rng) * 26 - 2])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L100 30 L0 30 Z`
  const id = `sg-${color.replace('#', '')}`
  return (
    <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// Modern KPI card: icon chip · label · animated value · delta · sparkline.
export default function KpiCard({ icon: Icon, label, value, unit, delta, spark, tone = 'blue', decimals = 0 }) {
  const color = TONE[tone] || TONE.blue
  const isNum = typeof value === 'number'
  const v = useCountUp(isNum ? value : 0)
  const shown = isNum ? v.toFixed(decimals) : value
  const up = delta != null && delta >= 0
  return (
    <div className="kpi-card">
      <div className="kc-top">
        <span className="kc-chip" style={{ background: `${color}1f`, color }}><Icon size={19} strokeWidth={2.2} /></span>
        {delta != null && (
          <span className={`kc-delta ${up ? 'up' : 'down'}`}>
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(delta)}{typeof delta === 'number' && Number.isInteger(delta) ? '' : '%'}
          </span>
        )}
      </div>
      <div className="kc-val">{shown}{unit && <span className="kc-unit">{unit}</span>}</div>
      <div className="kc-label">{label}</div>
      <div className="kc-spark"><Spark data={spark} color={color} /></div>
    </div>
  )
}
