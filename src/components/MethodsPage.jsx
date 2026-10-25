function pct(x) {
  return x == null ? '—' : `${(x * 100).toFixed(1)}%`
}

function ci(arr) {
  return Array.isArray(arr) && arr[0] != null && arr[1] != null
    ? `[${pct(arr[0])}, ${pct(arr[1])}]`
    : '—'
}

function ciNum(arr) {
  return Array.isArray(arr) && arr[0] != null && arr[1] != null
    ? `[${num(arr[0])}, ${num(arr[1])}]`
    : '—'
}

function num(x, d = 3) {
  return x == null ? '—' : Number(x).toFixed(d)
}

export default function MethodsPage({ t, validation, generatedOn, onBack }) {
  const v = validation || {}
  const axes = v.axes || {}
  const primary = v.primary || {}
  const st = axes.stiffness || {}
  const sw = axes.swingweight || {}
  const stCov = (st.coverage || {}).largest_mvp
  const swCov = (sw.coverage || {}).largest_mvp
  const m = t.methods

  const validationRows = [
    ['stiffness', primary.stiffness],
    ['swingweight', primary.swingweight],
  ]
  const axisLabel = (dim) => (dim === 'stiffness' ? t.detail.stiffness : t.detail.swingweight)

  return (
    <article className="methods">
      <div className="methods-head">
        <div>
          <h1>{m.title}</h1>
          <p className="muted">{m.updated(generatedOn)}</p>
        </div>
        <button className="back" onClick={onBack}>← {m.back}</button>
      </div>

      {m.intro.map((p, i) => <p key={`intro-${i}`}>{p}</p>)}

      <section>
        <h2>{m.why.h}</h2>
        {m.why.p.map((p, i) => <p key={`why-${i}`}>{p}</p>)}
      </section>

      <section>
        <h2>{m.data.h}</h2>
        {m.data.p.map((p, i) => <p key={`data-${i}`}>{p}</p>)}
      </section>

      <section>
        <h2>{m.grades.h}</h2>
        <table className="methods-table">
          <thead><tr>{m.grades.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {m.grades.rows.map((row) => (
              <tr key={row[0]}>
                <td><span className={`badge badge-${row[0].toLowerCase()}`}>{row[0]}</span></td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">{m.grades.note}</p>
      </section>

      <section>
        <h2>{m.limits.h}</h2>
        <ul>
          <li>{m.limits.single(st.worst_leave_one_source_out ?? '—', sw.worst_leave_one_source_out ?? '—')}</li>
          <li>{m.limits.subjective}</li>
          <li>{m.limits.gold}</li>
          <li>{m.limits.coverage(stCov ?? '—', swCov ?? '—')}</li>
          <li>{m.limits.official}</li>
        </ul>
      </section>

      <section>
        <h2>{m.validation.h}</h2>
        <p>{m.validation.p}</p>
        <table className="methods-table">
          <thead><tr>{m.validation.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {validationRows.map(([dim, r]) => (
              <tr key={dim}>
                <td>{axisLabel(dim)}</td>
                <td>{r?.groups ?? '—'}</td>
                <td>{r?.correct == null ? '—' : `${pct(r.correct)} ${ci(r.correct_ci)}`}</td>
                <td>{r?.brier == null ? '—' : `${num(r.brier)} ${ciNum(r.brier_ci)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">{m.validation.note}</p>
      </section>

      <section>
        <h2>{m.not.h}</h2>
        <ul>{m.not.p.map((p, i) => <li key={`not-${i}`}>{p}</li>)}</ul>
      </section>

      <section>
        <h2>{m.repro.h}</h2>
        <p>{m.repro.p}</p>
        <pre className="commands">{m.repro.commands.join('\n')}</pre>
      </section>
    </article>
  )
}
