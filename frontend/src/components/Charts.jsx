// DRISHTI charts — built on the data-viz method (validated dark categorical
// palette; correct form per job; recessive grid; hover tooltips).
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'

// Validated dark-mode categorical hues (CVD-safe, fixed order).
export const CAT = ['#3987e5', '#199e70', '#c98500', '#7c9cff', '#e66767', '#d55181', '#d95926', '#9085e9', '#8a8f98']
export const SECTOR_ORDER = ['trade', 'security', 'energy', 'water', 'labour', 'diplomacy', 'climate', 'health', 'other']
export const sectorColor = (s) => CAT[Math.max(0, SECTOR_ORDER.indexOf(s)) % CAT.length]
const SEV = { red: '#ff4d6a', amber: '#ffb020', green: '#2dd4a7' }
const fmtB = (v) => (v == null ? '—' : `$${(v / 1e9).toFixed(1)}B`)

// Theme-aware chart chrome — read the current CSS variables (re-read on render,
// so charts follow the light/dark toggle).
function chrome() {
  const cs = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const v = (n, f) => (cs ? (cs.getPropertyValue(n).trim() || f) : f)
  const c = { axis: v('--text-dim', '#8ea0c4'), grid: v('--chart-grid', 'rgba(255,255,255,0.08)'),
    surface: v('--bg-2', '#0a1122'), text: v('--text', '#eaf0fb') }
  c.tip = { contentStyle: { background: c.surface, border: `1px solid ${c.grid}`, borderRadius: 10, fontSize: 12, color: c.text },
    itemStyle: { color: c.text }, labelStyle: { color: c.axis } }
  return c
}

export function SectorDonut({ data }) {
  const c = chrome()
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2} stroke="none">
          {data.map((d) => <Cell key={d.name} fill={sectorColor(d.name)} />)}
        </Pie>
        <Tooltip {...c.tip} />
        <Legend wrapperStyle={{ fontSize: 11, color: c.axis }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function SeverityDonut({ counts }) {
  const data = [
    { name: 'Act now', value: counts.red || 0, c: SEV.red },
    { name: '30–90 day', value: counts.amber || 0, c: SEV.amber },
    { name: 'Nominal', value: counts.green || 0, c: SEV.green },
  ].filter((d) => d.value > 0)
  const c = chrome()
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2} stroke="none">
          {data.map((d) => <Cell key={d.name} fill={d.c} />)}
        </Pie>
        <Tooltip {...c.tip} />
        <Legend wrapperStyle={{ fontSize: 11, color: c.axis }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  )
}

// One event's relevance decomposed into its weighted components (magnitude → bars).
export function RelevanceBars({ components }) {
  const data = components.map((x) => ({ name: x.name.replace(' relevance', '').replace(' proximity', ''), value: Math.round(x.score * x.weight) }))
  const c = chrome()
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={c.grid} />
        <XAxis type="number" tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={78} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip {...c.tip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="value" fill="#3987e5" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Real World Bank time series (economic context).
export function EconLine({ series, colorIdx = 0 }) {
  if (!series || series.length === 0) return null
  const c = chrome()
  return (
    <ResponsiveContainer width="100%" height={170}>
      <LineChart data={series} margin={{ left: 4, right: 16, top: 6, bottom: 4 }}>
        <CartesianGrid stroke={c.grid} />
        <XAxis dataKey="year" tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtB} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip {...c.tip} formatter={(v) => fmtB(v)} />
        <Line type="monotone" dataKey="value" stroke={CAT[colorIdx % CAT.length]} strokeWidth={2}
          dot={{ r: 3, fill: CAT[colorIdx % CAT.length] }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
