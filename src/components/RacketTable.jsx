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
    return <div className="table-wrap"><p className="muted pad">{t.table.empty}</p></div>
  }
  return (
    <div className="table-wrap">
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
                <td>
                  <div className="model">{name}</div>
                  <div className="model-sub">{other} <span className="muted">#{r.id}</span></div>
                </td>
                <td>{r.brand}</td>
                <td>{r.year ?? '—'}</td>
                <td>{r.mvp ? <span className="mvp">MVP</span> : ''}</td>
                <td><GradeBadge grade={sw?.grade} sources={sw?.independent_sources} sd={firstSd(sw)} titleFn={t.gradeTitle} /></td>
                <td><GradeBadge grade={st?.grade} sources={st?.independent_sources} sd={firstSd(st)} titleFn={t.gradeTitle} /></td>
                <td>{r.has_estimate ? t.table.yes : <span className="muted">{t.table.no}</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

