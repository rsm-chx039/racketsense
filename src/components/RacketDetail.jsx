import { displayName, secondaryName, translateNote } from '../i18n.js'

const fmt = (v, digits = 1) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(digits))

function firstSd(axis) {
  if (!axis) return null
  if (axis.static_flex) return axis.static_flex.sd
  const first = Object.values(axis.by_u || {})[0]
  return first ? first.sd : null
}

function Ruler({ q05, value, q95 }) {
  if (q05 == null || q95 == null || value == null) return null
  const lo = Math.min(q05, q95)
  const hi = Math.max(q05, q95)
  const span = hi - lo || 1
  const pct = (x) => Math.max(0, Math.min(100, ((x - lo) / span) * 100))
  return (
    <div className="ruler" aria-hidden="true">
      <div className="ruler-track">
        <div className="ruler-fill" style={{ left: `${pct(lo)}%`, width: `${Math.max(2, pct(hi) - pct(lo))}%` }} />
        <div className="ruler-mark" style={{ left: `${pct(value)}%` }} />
      </div>
      <div className="ruler-ticks"><span>{fmt(lo)}</span><span>{fmt(hi)}</span></div>
    </div>
  )
}

function URows({ byU, unit, t }) {
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
          <Ruler q05={v.q05} value={v.value} q95={v.q95} />
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

export default function RacketDetail({ racket, estimate, allRackets, onSelect, t, lang }) {
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
        <h3>{t.detail.swingweight} <span className="muted">{t.units.swingweight}</span></h3>
        {sw?.note && <p className="note">{translateNote(sw.note, lang)}</p>}
        {sw?.by_u ? <URows byU={sw.by_u} unit={t.units.swingweight} t={t} /> : <p className="muted">{t.detail.noEstimateShort}</p>}
        {sw?.bg_only && <p className="note">{t.detail.bgOnly}</p>}
        {estimate?.u_assumed && <p className="note">{t.detail.uAssumed}</p>}
      </section>

      {hh?.by_u && (
        <section>
          <h3>{t.detail.headheavy} <span className="muted">{t.units.headheavy}</span></h3>
          <URows byU={hh.by_u} unit={t.units.headheavy} t={t} />
          <p className="note">{t.detail.headheavyNote}</p>
        </section>
      )}

      <section>
        <h3>{t.detail.stiffness} <span className="muted">{t.units.flex}</span></h3>
        {st?.note && <p className="note">{translateNote(st.note, lang)}</p>}
        {st?.static_flex ? (
          <div className="stiff">
            <div className="u-value">
              <strong>{fmt(st.static_flex.value, 2)}</strong>
              <span className="muted"> ± {fmt(st.static_flex.sd, 2)} {t.units.flex}</span>
              {!st.static_flex.certain && <span className="tag">{t.detail.insufficient}</span>}
            </div>
            <Ruler q05={st.static_flex.q05} value={st.static_flex.value} q95={st.static_flex.q95} />
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
