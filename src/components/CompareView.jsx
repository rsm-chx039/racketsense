import { useEffect, useMemo, useRef, useState } from 'react'
import { displayName } from '../i18n.js'

const NARROW_BREAK = 620
const initialWidth = () =>
  Math.min(1180, Math.max(320, (typeof window === 'undefined' ? 1180 : window.innerWidth) - 90))

const BRAND_COLORS = { Victor: '#1d4ed8', Yonex: '#12835c', 'Li-Ning': '#c2410c' }
const BRAND_FALLBACK = '#6b7383'
const U_ORDER = ['3U', '4U', '5U']

const brandColor = (b) => BRAND_COLORS[b] || BRAND_FALLBACK

function shapeOf(u) {
  if (u === '3U') return 'circle'
  if (u === '4U') return 'square'
  return 'triangle'
}

function Marker({ shape, cx, cy, r, fill, hollow, selected }) {
  const common = {
    className: 'cmp-dot',
    fill: hollow ? '#fffefb' : fill,
    stroke: hollow ? fill : '#fffefb',
    strokeWidth: hollow ? 1.5 : 1.1,
  }
  const body = shape === 'square' ? (
    <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx="1.4" {...common} />
  ) : shape === 'triangle' ? (
    <polygon points={`${cx},${cy - r * 1.2} ${cx + r},${cy + r * 0.8} ${cx - r},${cy + r * 0.8}`} {...common} />
  ) : (
    <circle cx={cx} cy={cy} r={r} {...common} />
  )
  return (
    <g>
      {selected && <circle cx={cx} cy={cy} r={r + 4.5} className="cmp-ring" />}
      {body}
    </g>
  )
}

function LegendShape({ shape, color }) {
  const p = { fill: color, stroke: '#fff', strokeWidth: 1 }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      {shape === 'square' ? (
        <rect x="1.5" y="1.5" width="7" height="7" rx="1" {...p} />
      ) : shape === 'triangle' ? (
        <polygon points="5,1.4 9,8.4 1,8.4" {...p} />
      ) : (
        <circle cx="5" cy="5" r="3.6" {...p} />
      )}
    </svg>
  )
}

function niceTicks(lo, hi, count = 6) {
  const raw = (hi - lo) / count
  if (!Number.isFinite(raw) || raw <= 0) return [lo, hi]
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const out = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(Number(v.toFixed(6)))
  return out
}

function fitLine(points) {
  const n = points.length
  if (n < 5) return null
  const mx = points.reduce((s, p) => s + p.x, 0) / n
  const my = points.reduce((s, p) => s + p.y, 0) / n
  let num = 0
  let den = 0
  let varY = 0
  for (const p of points) {
    num += (p.x - mx) * (p.y - my)
    den += (p.x - mx) ** 2
    varY += (p.y - my) ** 2
  }
  if (!den) return null
  const a = num / den
  return {
    a,
    b: my - a * mx,
    r: num / Math.sqrt(den * varY || 1),
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
  }
}

export default function CompareView({ rackets, estimates, meta, lang, t, selectedId, onSelect, onOpenDetail }) {
  const [plane, setPlane] = useState(() => (new URLSearchParams(window.location.search).get('plane') === 'flex' ? 'flex' : 'hh'))
  const [tab, setTab] = useState(() => (new URLSearchParams(window.location.search).get('tab') === 'table' ? 'table' : 'chart'))
  const [uFilter, setUFilter] = useState('all')
  const [brand, setBrand] = useState('all')
  const [query, setQuery] = useState('')
  const [onlyCertain, setOnlyCertain] = useState(false)
  const [showUncertain, setShowUncertain] = useState(true)
  const [showFit, setShowFit] = useState(true)
  const [hoverKey, setHoverKey] = useState(null)
  const [sort, setSort] = useState({ key: 'y', dir: -1 })

  const c = t.compare
  const plotRef = useRef(null)
  const [plotW, setPlotW] = useState(initialWidth)
  useEffect(() => {
    const el = plotRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width
      if (w) setPlotW(Math.round(w))
    })
    ro.observe(el)
    setPlotW(Math.round(el.getBoundingClientRect().width) || initialWidth())
    return () => ro.disconnect()
  }, [])
  const W = Math.min(1180, Math.max(320, plotW))
  const narrow = W < NARROW_BREAK
  const H = narrow ? Math.round(Math.min(660, W * 1.45)) : 620
  const M = narrow
    ? { l: 44, r: 16, t: 24, b: 46 }
    : { l: 64, r: 40, t: 28, b: 56 }
  const racketById = useMemo(() => new Map(rackets.map((r) => [r.id, r])), [rackets])

  const rows = useMemo(() => {
    const out = []
    for (const est of Object.values(estimates)) {
      const racket = racketById.get(est.id) || est
      if (plane === 'hh') {
        const swU = est.axes.swingweight?.by_u || {}
        const hhU = est.axes.headheavy?.by_u || {}
        for (const u of Object.keys(swU)) {
          if (!hhU[u]) continue
          out.push({
            key: `${est.id}:${u}`,
            id: est.id,
            u,
            racket,
            brand: racket.brand || '—',
            x: hhU[u].value,
            y: swU[u].value,
            certain: Boolean(hhU[u].certain && swU[u].certain),
            grade: est.axes.swingweight?.grade,
            stGrade: est.axes.stiffness?.grade,
          })
        }
      } else {
        const byU = est.axes.swingweight?.by_u || {}
        const u = byU['4U'] ? '4U' : Object.keys(byU)[0]
        const sf = est.axes.stiffness?.static_flex
        if (!u || !sf) continue
        out.push({
          key: est.id,
          id: est.id,
          u,
          racket,
          brand: racket.brand || '—',
          x: byU[u].value,
          y: sf.value,
          certain: Boolean(sf.certain),
          grade: est.axes.swingweight?.grade,
          stGrade: est.axes.stiffness?.grade,
        })
      }
    }
    return out
  }, [estimates, plane, racketById])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((p) => {
      if (uFilter !== 'all' && p.u !== uFilter) return false
      if (brand !== 'all' && p.brand !== brand) return false
      if (!showUncertain && !p.certain) return false
      if (onlyCertain && !p.certain) return false
      if (!q) return true
      const hay = [p.id, p.racket.name_cn, p.racket.name_en, ...(p.racket.aliases || [])].filter(Boolean)
      return hay.some((v) => String(v).toLowerCase().includes(q))
    })
  }, [rows, uFilter, brand, onlyCertain, showUncertain, query])

  const stats = useMemo(() => {
    const all = Object.values(estimates)
    const bothA = all.filter((e) => e.axes.swingweight?.grade === 'A' && e.axes.stiffness?.grade === 'A').length
    const swA = all.filter((e) => e.axes.swingweight?.grade === 'A').length
    const stA = all.filter((e) => e.axes.stiffness?.grade === 'A').length
    return { total: rackets.length, withEst: all.length, bothA, swA, stA, officialOnly: rackets.length - all.length }
  }, [estimates, rackets])

  const brands = useMemo(() => {
    const counts = new Map()
    rows.forEach((p) => counts.set(p.brand, (counts.get(p.brand) || 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const modelCount = useMemo(() => new Set(filtered.map((p) => p.id)).size, [filtered])

  const [xd, yd] = useMemo(() => {
    const base = filtered.length ? filtered : rows
    if (!base.length) return [[0, 1], [0, 1]]
    const range = (vals) => {
      const lo = Math.min(...vals)
      const hi = Math.max(...vals)
      const d = (hi - lo) * 0.06 || 1
      return [lo - d, hi + d]
    }
    return [range(base.map((p) => p.x)), range(base.map((p) => p.y))]
  }, [filtered, rows])

  const sx = (v) => M.l + ((v - xd[0]) / (xd[1] - xd[0] || 1)) * (W - M.l - M.r)
  const sy = (v) => H - M.b - ((v - yd[0]) / (yd[1] - yd[0] || 1)) * (H - M.t - M.b)

  const fits = useMemo(() => {
    if (plane !== 'hh') {
      const f = fitLine(filtered)
      return f ? [{ u: c.all, ...f }] : []
    }
    return U_ORDER.map((u) => {
      const f = fitLine(filtered.filter((p) => p.u === u))
      return f ? { u, ...f } : null
    }).filter(Boolean)
  }, [filtered, plane, c.all])

  const tickX = niceTicks(xd[0], xd[1], narrow ? 5 : 6)
  const tickY = niceTicks(yd[0], yd[1], narrow ? 5 : 6)

  const sorted = useMemo(() => {
    const list = [...filtered]
    const { key, dir } = sort
    list.sort((a, b) => {
      if (key === 'name') return dir * displayName(a.racket, lang).localeCompare(displayName(b.racket, lang))
      if (key === 'brand') return dir * String(a.brand).localeCompare(String(b.brand))
      if (key === 'u') return dir * (U_ORDER.indexOf(a.u) - U_ORDER.indexOf(b.u))
      const av = key === 'grade' ? (a.grade || 'Z') : a[key]
      const bv = key === 'grade' ? (b.grade || 'Z') : b[key]
      return dir * (av > bv ? 1 : av < bv ? -1 : 0)
    })
    return list
  }, [filtered, sort, lang])

  const selected = rows.find((p) => p.id === selectedId) || null
  const hovered = rows.find((p) => p.key === hoverKey) || null
  const axis = plane === 'hh' ? { x: c.axis.hh, y: c.axis.sw } : { x: c.axis.sw, y: c.axis.flex }
  const arrow = (k) => (sort.key === k ? (sort.dir > 0 ? ' ▲' : ' ▼') : '')
  const sortBy = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === 'name' || key === 'brand' ? 1 : -1 }))

  return (
    <div className="cmp">
      <section className="cmp-hero">
        <div className="cmp-hero-top">
          <div>
            <div className="cmp-eyebrow">
              <span>RacketSense</span>
              <span className="dotline" aria-hidden="true" />
              <span>{c.eyebrow}</span>
            </div>
            <h1>{c.title}</h1>
            <p className="cmp-sub">{c.subtitle}</p>
          </div>
          <div className="cmp-meta">
            <span><b>{c.metaRound}</b>{meta?.product_round || '—'}</span>
            <span><b>{c.metaUpdated}</b>{meta?.generated_on || '—'}</span>
            <span><b>sha16</b>{String(meta?.master_sha16 || '').slice(0, 12) || '—'}</span>
          </div>
        </div>
        <dl className="cmp-hero-stats">
          <div><dt>{c.stats.total}</dt><dd>{stats.total}</dd></div>
          <div><dt>{c.stats.withEst}</dt><dd>{stats.withEst}</dd></div>
          <div><dt>{c.stats.bothA}</dt><dd>{stats.bothA}</dd></div>
          <div><dt>{c.stats.swA}</dt><dd>{stats.swA}</dd></div>
          <div><dt>{c.stats.stA}</dt><dd>{stats.stA}</dd></div>
          <div><dt>{c.stats.officialOnly}</dt><dd>{stats.officialOnly}</dd></div>
        </dl>
        <p className="hero-notice">
          <strong>{c.noteTitle}</strong>
          {c.note}
        </p>
      </section>

      <nav className="cmp-tabs" aria-label={c.title}>
        <button className={tab === 'chart' ? 'active' : ''} aria-current={tab === 'chart' ? 'page' : undefined} onClick={() => setTab('chart')}>{c.tabs.chart}</button>
        <button className={tab === 'table' ? 'active' : ''} aria-current={tab === 'table' ? 'page' : undefined} onClick={() => setTab('table')}>{c.tabs.table}</button>
      </nav>

      <section className="cmp-filters" aria-label={c.plane.label}>
        <div className="cmp-frow">
          <div className="cmp-group">
            <span className="cmp-flabel">{c.plane.label}</span>
            <div className="seg">
              <button className={plane === 'hh' ? 'active' : ''} aria-pressed={plane === 'hh'} onClick={() => setPlane('hh')}>{c.plane.hh}</button>
              <button className={plane === 'flex' ? 'active' : ''} aria-pressed={plane === 'flex'} onClick={() => setPlane('flex')}>{c.plane.flex}</button>
            </div>
          </div>
          <div className="cmp-group">
            <span className="cmp-flabel">{c.spec.label}</span>
            <div className="cmp-chips">
              <button className={`cmp-chip${uFilter === 'all' ? ' active' : ''}`} onClick={() => setUFilter('all')}>{c.all}</button>
              {U_ORDER.map((u) => (
                <button key={u} className={`cmp-chip${uFilter === u ? ' active' : ''}`} onClick={() => setUFilter(u)}>{u}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="cmp-frow">
          <div className="cmp-group">
            <span className="cmp-flabel">{c.brandLabel}</span>
            <div className="cmp-chips">
              <button className={`cmp-chip${brand === 'all' ? ' active' : ''}`} onClick={() => setBrand('all')}>{c.all}</button>
              {brands.map(([b, n]) => (
                <button key={b} className={`cmp-chip${brand === b ? ' active' : ''}`} onClick={() => setBrand(brand === b ? 'all' : b)}>
                  <i className="swatch" style={{ background: brandColor(b) }} />
                  {b}<span className="cmp-chip-n">{n}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="cmp-checks">
            <label className="cmp-check">
              <input type="checkbox" checked={onlyCertain} onChange={(e) => setOnlyCertain(e.target.checked)} />
              {c.filters.onlyCertain}
            </label>
            <label className="cmp-check">
              <input type="checkbox" checked={showUncertain} onChange={(e) => setShowUncertain(e.target.checked)} />
              {c.filters.showUncertain}
            </label>
            <label className="cmp-check">
              <input type="checkbox" checked={showFit} onChange={(e) => setShowFit(e.target.checked)} />
              {c.filters.showFit}
            </label>
          </div>
          <label className="search-field cmp-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.6-3.6" />
            </svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.search} aria-label={c.search} />
          </label>
        </div>
      </section>

      {tab === 'chart' ? (
        <section className="cmp-chartcard">
          <div className="cmp-chart-head">
            <span className="cmp-count">{c.count(filtered.length, modelCount)}</span>
            <div className="cmp-legend">
              {brands.map(([b]) => (
                <span className="k" key={b}><i className="swatch" style={{ background: brandColor(b) }} />{b}</span>
              ))}
              <span className="k cmp-shapes">
                {U_ORDER.map((u) => (
                  <span className="cmp-shape" key={u}><LegendShape shape={shapeOf(u)} color="#5b6472" />{u}</span>
                ))}
              </span>
              {narrow && showFit && fits.map((f) => (
                <span className="k fitkey" key={`fitkey-${f.u}`}>{f.u} r={f.r.toFixed(3)}</span>
              ))}
              <span className="k">{c.legend.insufficient}</span>
            </div>
          </div>

          <div className="plot-scroll" ref={plotRef}>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={c.title}>
              <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} className="cmp-plotbg" />
              {tickX.map((v) => (
                <g key={`x${v}`}>
                  <line x1={sx(v)} x2={sx(v)} y1={M.t} y2={H - M.b} className="cmp-grid" />
                  <text x={sx(v)} y={H - M.b + 17} textAnchor="middle" className="cmp-axis">{v.toFixed(0)}</text>
                </g>
              ))}
              {tickY.map((v) => (
                <g key={`y${v}`}>
                  <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} className="cmp-grid" />
                  <text x={M.l - 9} y={sy(v) + 3.5} textAnchor="end" className="cmp-axis">{v.toFixed(plane === 'hh' ? 1 : 2)}</text>
                </g>
              ))}

              <text x={(M.l + W - M.r) / 2} y={H - 12} textAnchor="middle" className="cmp-axtitle">{axis.x} →</text>
              <text
                x={16}
                y={(M.t + H - M.b) / 2}
                textAnchor="middle"
                transform={`rotate(-90 16 ${(M.t + H - M.b) / 2})`}
                className="cmp-axtitle"
              >
                {axis.y} →
              </text>

              {showFit && fits.map((f) => (
                <g key={`fit-${f.u}`}>
                  <line
                    x1={sx(f.minX)}
                    y1={sy(f.a * f.minX + f.b)}
                    x2={sx(f.maxX)}
                    y2={sy(f.a * f.maxX + f.b)}
                    className="cmp-fit"
                  />
                  {!narrow && (
                    <text
                      x={sx(f.maxX) > W - 96 ? sx(f.maxX) - 4 : sx(f.maxX) + 4}
                      y={sy(f.a * f.maxX + f.b) - 5}
                      textAnchor={sx(f.maxX) > W - 96 ? 'end' : 'start'}
                      className="cmp-fitlabel"
                    >
                      {c.fitLabel(f.u, f.r.toFixed(3))}
                    </text>
                  )}
                </g>
              ))}

              {filtered.map((p) => (
                <g
                  key={p.key}
                  className="cmp-pt"
                  onClick={() => onSelect(p.id)}
                  onMouseEnter={() => setHoverKey(p.key)}
                  onMouseLeave={() => setHoverKey((k) => (k === p.key ? null : k))}
                >
                  <title>{`${displayName(p.racket, lang)} · ${p.brand} · ${p.u} · ${axis.x} ${p.x.toFixed(1)} · ${axis.y} ${p.y.toFixed(2)}`}</title>
                  <Marker
                    shape={shapeOf(p.u)}
                    cx={sx(p.x)}
                    cy={sy(p.y)}
                    r={hoverKey === p.key ? (narrow ? 8.5 : 6.8) : (narrow ? 5.8 : 4.6)}
                    fill={brandColor(p.brand)}
                    hollow={!p.certain}
                    selected={p.id === selectedId}
                  />
                </g>
              ))}

              {hovered && (
                <text
                  x={Math.min(sx(hovered.x) + 9, W - 8)}
                  y={Math.max(sy(hovered.y) - 8, M.t + 10)}
                  textAnchor={sx(hovered.x) > W - 220 ? 'end' : 'start'}
                  className="cmp-hover"
                >
                  {displayName(hovered.racket, lang)} · {hovered.u}
                </text>
              )}
            </svg>
          </div>

          <div className="cmp-picked">
            {selected ? (
              <>
                <span className="cmp-picked-name">{displayName(selected.racket, lang)}</span>
                <span className="cmp-picked-meta">
                  {selected.brand} · {selected.u} ·{' '}
                  {plane === 'hh'
                    ? `${c.table.hh} ${selected.x.toFixed(1)} · ${c.table.sw} ${selected.y.toFixed(1)}`
                    : `${c.table.sw} ${selected.x.toFixed(1)} · ${c.table.flex} ${selected.y.toFixed(2)}`}
                </span>
                <span className={`cmp-badge${selected.certain ? ' ok' : ''}`}>
                  {selected.certain ? c.picked.certain : c.picked.insufficient}
                </span>
                <button className="cmp-picked-open" onClick={() => onOpenDetail(selected.id)}>{c.picked.open}</button>
              </>
            ) : (
              <span className="muted">{c.picked.hint}</span>
            )}
          </div>
        </section>
      ) : (
        <section className="cmp-tablecard">
          <table className="cmp-table">
            <thead>
              <tr>
                <th onClick={() => sortBy('name')}>{c.table.model}{arrow('name')}</th>
                <th onClick={() => sortBy('brand')}>{c.table.brand}{arrow('brand')}</th>
                <th onClick={() => sortBy('u')}>{c.table.spec}{arrow('u')}</th>
                {plane === 'hh' ? (
                  <>
                    <th className="num" onClick={() => sortBy('y')}>{c.table.sw}{arrow('y')}</th>
                    <th className="num" onClick={() => sortBy('x')}>{c.table.hh}{arrow('x')}</th>
                  </>
                ) : (
                  <>
                    <th className="num" onClick={() => sortBy('x')}>{c.table.sw}{arrow('x')}</th>
                    <th className="num" onClick={() => sortBy('y')}>{c.table.flex}{arrow('y')}</th>
                  </>
                )}
                <th onClick={() => sortBy('grade')}>{c.table.grade}{arrow('grade')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.key} className={p.id === selectedId ? 'selected' : ''} onClick={() => onSelect(p.id)}>
                  <td>{displayName(p.racket, lang)}</td>
                  <td className="muted">{p.brand}</td>
                  <td>{p.u}</td>
                  {plane === 'hh' ? (
                    <>
                      <td className="num">{p.y.toFixed(1)}</td>
                      <td className="num">{p.x.toFixed(1)}</td>
                    </>
                  ) : (
                    <>
                      <td className="num">{p.x.toFixed(1)}</td>
                      <td className="num">{p.y.toFixed(2)}</td>
                    </>
                  )}
                  <td>{p.grade || '—'}{plane === 'flex' ? ` / ${p.stGrade || '—'}` : ''}</td>
                </tr>
              ))}
              {!sorted.length && (
                <tr><td colSpan="6" className="muted pad">{c.table.empty}</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
