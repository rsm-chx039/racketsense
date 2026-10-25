import GradeBadge from './GradeBadge.jsx'
import { displayName, secondaryName } from '../i18n.js'

function firstSd(axis) {
  if (!axis) return null
  if (axis.static_flex) return axis.static_flex.sd
  const byU = axis.by_u || {}
  const first = Object.values(byU)[0]
  return first ? first.sd : null
}

export default function RacketTable({ rackets, estimates, selectedId, onSelect, t, lang }) {
  if (!rackets.length) {
    return <p className="muted pad">{t.table.empty}</p>
  }
  return (
    <table>
      <thead>
        <tr>
          <th>{t.table.model}</th>
          <th>{t.table.brand}</th>
          <th>{t.table.year}</th>
          <th>{t.table.mvp}</th>
          <th title={t.table.swTitle}>{t.table.swingweight}</th>
          <th title={t.table.stTitle}>{t.table.stiffness}</th>
          <th title={t.table.estTitle}>{t.table.estimate}</th>
        </tr>
      </thead>
      <tbody>
        {rackets.map((r) => {
          const e = estimates[r.id]
          const sw = e?.axes.swingweight
          const st = e?.axes.stiffness
          const name = displayName(r, lang)
          const other = secondaryName(r, lang)
          return (
            <tr
              key={r.id}
              className={r.id === selectedId ? 'selected' : ''}
              onClick={() => onSelect(r.id)}
              tabIndex={0}
              onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && onSelect(r.id)}
              aria-selected={r.id === selectedId}
            >
              <td className="c-model">
                <div className="model">{name}</div>
                <div className="model-sub">
                  {other} <span className="brand-inline">{r.brand}</span> <span className="id">#{r.id}</span>
                </div>
              </td>
              <td className="c-brand"><span className="brand">{r.brand}</span></td>
              <td className="c-year">{r.year ?? '—'}</td>
              <td className="c-mvp">{r.mvp ? <span className="mvp">MVP</span> : ''}</td>
              <td className="c-grade">
                <GradeBadge grade={sw?.grade} sources={sw?.independent_sources} sd={firstSd(sw)} titleFn={t.gradeTitle} />
              </td>
              <td className="c-grade">
                <GradeBadge grade={st?.grade} sources={st?.independent_sources} sd={firstSd(st)} titleFn={t.gradeTitle} />
              </td>
              <td className="c-est">
                {r.has_estimate
                  ? <span className="yes">{t.table.yes}</span>
                  : <span className="no">{t.table.no}</span>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
