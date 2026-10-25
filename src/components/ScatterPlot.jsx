import { useMemo } from 'react'
import { displayName } from '../i18n.js'

const W = 760
const H = 420
const M = { l: 58, r: 24, t: 24, b: 46 }

function extent(values, pad = 0.05) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min === max) return [min - 1, max + 1]
  const d = (max - min) * pad
  return [min - d, max + d]
}

function ticks([lo, hi], n = 5) {
  return Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n)
}

export default function ScatterPlot({ estimates, selectedId, onSelect, t, lang }) {
  const points = useMemo(() => {
    return Object.values(estimates)
      .map((e) => {
        const byU = e.axes.swingweight.by_u || {}
        const u = byU['4U'] ? '4U' : Object.keys(byU)[0]
        const sw = u ? byU[u] : null
        const st = e.axes.stiffness.static_flex
        if (!sw || !st || e.axes.swingweight.grade === 'C' || e.axes.stiffness.grade === 'C') return null
        return {
          id: e.id,
          name: displayName(e, lang),
          u,
          x: sw.value,
          sx: sw.sd,
          y: st.value,
          sy: st.sd,
          grade: e.axes.swingweight.grade,
        }
      })
      .filter(Boolean)
  }, [estimates, lang])

  if (!points.length) {
    return <section className="chart"><h2>{t.chart.title}</h2><p className="muted">{t.chart.empty}</p></section>
  }

  const xd = extent(points.map((p) => p.x))
  const yd = extent(points.map((p) => p.y))
  const x = (v) => M.l + ((v - xd[0]) / (xd[1] - xd[0])) * (W - M.l - M.r)
  const y = (v) => H - M.b - ((v - yd[0]) / (yd[1] - yd[0])) * (H - M.t - M.b)

  return (
    <section className="chart">
      <div className="chart-head">
        <h2>{t.chart.title} <span className="muted">{t.chart.subtitle}</span></h2>
        <div className="legend">
          <span><i className="dot grade-a" /> A</span>
          <span><i className="dot grade-b" /> B</span>
          <span className="muted">{t.chart.note}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.chart.aria}>
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} className="plot-bg" />
        {ticks(xd).map((v) => (
          <g key={`x-${v}`}>
            <line x1={x(v)} x2={x(v)} y1={M.t} y2={H - M.b} className="grid" />
            <text x={x(v)} y={H - M.b + 18} textAnchor="middle" className="tick">{v.toFixed(1)}</text>
          </g>
        ))}
        {ticks(yd).map((v) => (
          <g key={`y-${v}`}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="tick">{v.toFixed(1)}</text>
          </g>
        ))}
        {points.map((p) => (
          <g key={p.id} className={p.id === selectedId ? 'point selected' : 'point'} onClick={() => onSelect(p.id)}>
            <title>{t.chart.tooltip(p.name, p.id, p.u, p.x.toFixed(1), p.sx.toFixed(1), p.y.toFixed(2), p.sy.toFixed(2))}</title>
            <line x1={x(p.x - p.sx)} x2={x(p.x + p.sx)} y1={y(p.y)} y2={y(p.y)} className="err" />
            <line x1={x(p.x)} x2={x(p.x)} y1={y(p.y - p.sy)} y2={y(p.y + p.sy)} className="err" />
            <circle cx={x(p.x)} cy={y(p.y)} r={5} className={`dot grade-${p.grade.toLowerCase()}`} />
          </g>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" className="axis">{t.chart.x}</text>
        <text x={14} y={(M.t + H - M.b) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(M.t + H - M.b) / 2})`} className="axis">{t.chart.y}</text>
      </svg>
    </section>
  )
}

