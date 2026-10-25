import { useMemo } from 'react'
import { displayName, secondaryName, translateNote } from '../i18n.js'

const fmt = (v, digits = 1) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(digits))

function firstSd(axis) {
  if (!axis) return null
  if (axis.static_flex) return axis.static_flex.sd
  const first = Object.values(axis.by_u || {})[0]
  return first ? first.sd : null
}

function Ruler({ q05, value, q95, domain, median, digits = 1 }) {
  if (q05 == null || q95 == null || value == null) return null
  const band = { lo: Math.min(q05, q95), hi: Math.max(q05, q95) }
  // 有全库量程就画在共享刻度上（不同球拍可比较）；没有则退回本型号区间。
  const scale = domain && domain.hi > domain.lo ? domain : band
  const span = scale.hi - scale.lo || 1
  const pct = (x) => Math.max(0, Math.min(100, ((x - scale.lo) / span) * 100))
  return (
    <div className="ruler" aria-hidden="true">
      <div className="ruler-track">
        <div
          className="ruler-fill"
          style={{ left: `${pct(band.lo)}%`, width: `${Math.max(1.2, pct(band.hi) - pct(band.lo))}%` }}
        />
        {median != null && scale === domain && <div className="ruler-median" style={{ left: `${pct(median)}%` }} />}
        <div className="ruler-mark" style={{ left: `${pct(value)}%` }} />
      </div>
      <div className="ruler-ticks">
        <span>{fmt(scale.lo, digits)}</span>
        <span>{fmt(scale.hi, digits)}</span>
      </div>
    </div>
  )
}

function collectDomain(allEstimates, pick) {
  const vals = []
  for (const e of Object.values(allEstimates || {})) {
    for (const v of pick(e)) if (v != null && Number.isFinite(v)) vals.push(v)
  }
  if (!vals.length) return null
  const sorted = [...vals].sort((a, b) => a - b)
  return { lo: sorted[0], hi: sorted[sorted.length - 1], med: sorted[Math.floor(sorted.length / 2)] }
}

function URows({ byU, unit, t, domain, digits = 1 }) {
  if (!byU) return <p className="muted">{t.detail.noEstimateShort}</p>
  return (
    <div className="u-list">
      {Object.entries(byU).map(([u, v]) => (
        <div className="u-row" key={u}>
          <div className="u-label">{u}</div>
          <div className="u-value">
            <strong>{fmt(v.value)}</strong>
            <span className="muted"> ± {fmt(v.sd)} {unit}</span>
            {!v.certain && <span className="tag">{t.detail.insufficient}</span>}
          </div>
          <Ruler q05={v.q05} value={v.value} q95={v.q95} domain={domain} median={domain?.med} digits={digits} />
          <div className="u-meta">{t.detail.interval} {fmt(v.q05)}–{fmt(v.q95)} · n={v.n_obs ?? 0}</div>
        </div>
      ))}
    </div>
  )
}

function Spec({ label, value }) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null
  const text = Array.isArray(value) ? value.join(' / ') : value
  return (
    <div className="spec">
      <dt>{label}</dt>
      <dd>{text}</dd>
    </div>
  )
}

function GradeTile({ label, axis, t, noEstimateShort }) {
  const g = axis?.grade
  const n = axis?.independent_sources ?? 0
  const title = g ? t.gradeTitle(n, firstSd(axis)) : noEstimateShort
  return (
    <div className="grade-tile" title={title}>
      <span className="gt-label">{label}</span>
      <span className="gt-row">
        <span className={`gt-letter l-${g ? g.toLowerCase() : 'x'}`}>{g || '—'}</span>
        <span className="gt-sub">{g ? t.detail.sourcesShort(n) : noEstimateShort}</span>
      </span>
    </div>
  )
}

export default function RacketDetail({ racket, estimate, allRackets, allEstimates, onSelect, t, lang }) {
  const domains = useMemo(
    () => ({
      sw: collectDomain(allEstimates, (e) =>
        Object.values(e.axes?.swingweight?.by_u || {}).flatMap((v) => [v?.value, v?.q05, v?.q95])),
      hh: collectDomain(allEstimates, (e) =>
        Object.values(e.axes?.headheavy?.by_u || {}).flatMap((v) => [v?.value, v?.q05, v?.q95])),
      st: collectDomain(allEstimates, (e) => {
        const f = e.axes?.stiffness?.static_flex
        return [f?.value, f?.q05, f?.q95]
      }),
    }),
    [allEstimates],
  )
  if (!racket) return <aside className="detail"><p className="muted">{t.detail.pick}</p></aside>

  const sw = estimate?.axes.swingweight
  const hh = estimate?.axes.headheavy
  const st = estimate?.axes.stiffness
  const children = allRackets.filter((r) => r.variant_of === racket.id)
  const parent = racket.variant_of ? allRackets.find((r) => r.id === racket.variant_of) : null
  const name = displayName(racket, lang)
  const other = secondaryName(racket, lang)

  return (
    <aside className="detail">
      <div className="detail-head">
        <div>
          <h2>{name}</h2>
          <p className="detail-meta">
            {other && <><span>{other}</span><span className="sep">·</span></>}
            <span className="id">#{racket.id}</span>
            <span className="sep">·</span>
            <span>{racket.brand}</span>
          </p>
        </div>
        <div className="detail-tags">
          {racket.mvp && <span className="mvp">{t.detail.mvp}</span>}
          {racket.tier === 'secondary' && <span className="tag">{t.detail.secondary}</span>}
        </div>
      </div>

      <div className="grade-tiles">
        <GradeTile label={t.detail.swingweight} axis={sw} t={t} noEstimateShort={t.detail.noEstimateShort} />
        <GradeTile label={t.detail.stiffness} axis={st} t={t} noEstimateShort={t.detail.noEstimateShort} />
      </div>

      {!estimate && <p className="note">{t.detail.noEstimate}</p>}

      <section>
        <h3>
          {t.detail.swingweight} <span className="muted">{t.units.swingweight}</span>
          {domains.sw && <span className="sec-range">{t.detail.rangeLabel(fmt(domains.sw.lo), fmt(domains.sw.hi), fmt(domains.sw.med))}</span>}
        </h3>
        {sw?.note && <p className="note">{translateNote(sw.note, lang)}</p>}
        {sw?.by_u ? <URows byU={sw.by_u} unit={t.units.swingweight} t={t} domain={domains.sw} digits={1} /> : <p className="muted">{t.detail.noEstimateShort}</p>}
        {sw?.bg_only && <p className="note">{t.detail.bgOnly}</p>}
        {estimate?.u_assumed && <p className="note">{t.detail.uAssumed}</p>}
      </section>

      {hh?.by_u && (
        <section>
          <h3>
            {t.detail.headheavy} <span className="muted">{t.units.headheavy}</span>
            {domains.hh && <span className="sec-range">{t.detail.rangeLabel(fmt(domains.hh.lo), fmt(domains.hh.hi), fmt(domains.hh.med))}</span>}
          </h3>
          <URows byU={hh.by_u} unit={t.units.headheavy} t={t} domain={domains.hh} digits={1} />
          <p className="note">{t.detail.headheavyNote}</p>
        </section>
      )}

      <section>
        <h3>
          {t.detail.stiffness} <span className="muted">{t.units.flex}</span>
          {domains.st && <span className="sec-range">{t.detail.rangeLabel(fmt(domains.st.lo, 2), fmt(domains.st.hi, 2), fmt(domains.st.med, 2))}</span>}
        </h3>
        {st?.note && <p className="note">{translateNote(st.note, lang)}</p>}
        {st?.static_flex ? (
          <div className="stiff">
            <div className="u-value">
              <strong>{fmt(st.static_flex.value, 2)}</strong>
              <span className="muted"> ± {fmt(st.static_flex.sd, 2)} {t.units.flex}</span>
              {!st.static_flex.certain && <span className="tag">{t.detail.insufficient}</span>}
            </div>
            <Ruler q05={st.static_flex.q05} value={st.static_flex.value} q95={st.static_flex.q95} domain={domains.st} median={domains.st?.med} digits={2} />
            <p className="u-meta">{t.detail.interval} {fmt(st.static_flex.q05, 2)}–{fmt(st.static_flex.q95, 2)} · n={st.static_flex.n_bg ?? 0}</p>
          </div>
        ) : (
          <p className="muted">{t.detail.noEstimateShort}</p>
        )}
        <p className="note">{t.detail.subjective}；{t.detail.officialLabel}：{st?.official_label || racket.official_flex || '—'}。</p>
      </section>

      <section>
        <h3>{t.detail.official}</h3>
        <dl className="specs">
          <Spec label={t.specs.series} value={racket.series} />
          <Spec label={t.specs.year} value={racket.year} />
          <Spec label={t.specs.u} value={racket.spec_u} />
          <Spec label={t.specs.grip} value={racket.grip} />
          <Spec label={t.specs.shaft} value={racket.shaft_mm} />
          <Spec label={t.specs.tension} value={racket.max_tension_lbs ? `${racket.max_tension_lbs} lbs` : null} />
          <Spec label={t.specs.balance} value={racket.balance_mm ? `${racket.balance_mm} mm` : null} />
          <Spec label={t.specs.swingweight} value={racket.swingweight_kgcm2 ? `${racket.swingweight_kgcm2} kg·cm²` : null} />
          <Spec label={t.specs.flex} value={racket.official_flex} />
          <Spec label={t.specs.playBalance} value={racket.balance_play_mm ? `${racket.balance_play_mm} mm` : null} />
          <Spec label={t.specs.playCondition} value={racket.balance_play_condition} />
        </dl>
      </section>

      {((sw?.links?.length > 0) || (st?.links?.length > 0)) ? (
        <section>
          <h3>{t.detail.links}</h3>
          <ul className="links">
            {[...(sw?.links || []), ...(st?.links || [])].map((l) => (
              <li key={`${l.source_key}-${l.url}`}>
                <a href={l.url} target="_blank" rel="noreferrer">{l.source_key}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section>
          <h3>{t.detail.links}</h3>
          <p className="muted">{t.detail.noLinks}</p>
        </section>
      )}

      {(parent || children.length > 0) && (
        <section>
          <h3>{t.detail.relations}</h3>
          {parent && (
            <p className="note">
              {t.detail.parentPrefix}{' '}
              <button className="link" onClick={() => onSelect(parent.id)}>#{parent.id} {displayName(parent, lang)}</button>
              {t.detail.parentSuffix}
            </p>
          )}
          {children.length > 0 && (
            <ul className="links">
              {children.map((c) => (
                <li key={c.id}><button className="link" onClick={() => onSelect(c.id)}>#{c.id} {displayName(c, lang)}</button></li>
              ))}
            </ul>
          )}
        </section>
      )}
    </aside>
  )
}
