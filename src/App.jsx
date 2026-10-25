import { useEffect, useMemo, useState } from 'react'
import RacketTable from './components/RacketTable.jsx'
import RacketDetail from './components/RacketDetail.jsx'
import ScatterPlot from './components/ScatterPlot.jsx'
import MethodsPage from './components/MethodsPage.jsx'
import { copy } from './i18n.js'

const BASE = import.meta.env.BASE_URL || '/'

async function fetchJson(name) {
  const res = await fetch(`${BASE}data/${name}`)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  return res.json()
}

function matches(racket, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [racket.id, racket.name_cn, racket.name_en, ...(racket.aliases || [])]
    .filter(Boolean)
    .some((x) => String(x).toLowerCase().includes(q))
}

export default function App() {
  const [rackets, setRackets] = useState(null)
  const [estimates, setEstimates] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('all')
  const [grade, setGrade] = useState('all')
  const [hasEstimate, setHasEstimate] = useState(false)
  const [mvpOnly, setMvpOnly] = useState(false)
  const [lang, setLang] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('lang')
      if (q === 'en' || q === 'zh') return q
      return localStorage.getItem('rs-lang') || 'zh'
    } catch {
      return 'zh'
    }
  })
  const [view, setView] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('view') === 'methods' ? 'methods' : 'main'
    } catch {
      return 'main'
    }
  })
  const t = copy[lang] || copy.zh

  useEffect(() => {
    let alive = true
    Promise.all([fetchJson('rackets.json'), fetchJson('estimates.json')])
      .then(([rk, est]) => {
        if (!alive) return
        setRackets(rk)
        setEstimates(est)
        const first = rk.rackets.find((r) => r.mvp) || rk.rackets[0]
        setSelectedId(first ? first.id : null)
      })
      .catch((err) => alive && setError(err.message))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
    document.title = view === 'methods' ? `${t.methods.title} — RacketSense` : t.pageTitle
    try {
      localStorage.setItem('rs-lang', lang)
      const url = new URL(window.location.href)
      if (lang === 'en') url.searchParams.set('lang', 'en')
      else url.searchParams.delete('lang')
      if (view === 'methods') url.searchParams.set('view', 'methods')
      else url.searchParams.delete('view')
      window.history.replaceState({}, '', url)
    } catch {
      /* ignore */
    }
  }, [lang, view, t.pageTitle, t.methods.title])

  const brands = useMemo(
    () => (rackets ? [...new Set(rackets.rackets.map((r) => r.brand).filter(Boolean))].sort() : []),
    [rackets],
  )

  const filtered = useMemo(() => {
    if (!rackets || !estimates) return []
    return rackets.rackets
      .filter((r) => !mvpOnly || r.mvp)
      .filter((r) => brand === 'all' || r.brand === brand)
      .filter((r) => !hasEstimate || r.has_estimate)
      .filter((r) => matches(r, query))
      .filter((r) => {
        if (grade === 'all') return true
        const e = estimates.rackets[r.id]
        if (!e) return false
        return e.axes.swingweight.grade === grade || e.axes.stiffness.grade === grade
      })
      .sort((a, b) => (Number(b.mvp) - Number(a.mvp)) || a.brand.localeCompare(b.brand) || a.id.localeCompare(b.id))
  }, [rackets, estimates, mvpOnly, brand, hasEstimate, query, grade])

  const selected = rackets && selectedId ? rackets.rackets.find((r) => r.id === selectedId) : null
  const selectedEstimate = estimates && selectedId ? estimates.rackets[selectedId] : null

  if (error) {
    return (
      <div className="state state-error">
        <h1>{t.loadError}</h1>
        <p>{error}</p>
        <p>{t.loadHint}</p>
      </div>
    )
  }

  if (!rackets || !estimates) {
    return <div className="state">{t.loading}</div>
  }

  return (
    <div className="app">
      <header className="site-header">
        <div>
          <h1>RacketSense</h1>
          <p className="subtitle">{t.subtitle}</p>
        </div>
        <div className="header-right">
          <button className="nav-link" onClick={() => setView(view === 'methods' ? 'main' : 'methods')}>
            {view === 'methods' ? t.methods.back : t.methods.title}
          </button>
          <div className="version">{t.version(rackets.meta.generated_on)}</div>
          <div className="lang-toggle" role="group" aria-label={t.langLabel}>
            <button className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>中文</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>
      </header>

      <div className="disclaimer" role="note">
        <strong>{t.disclaimerTitle}</strong>
        <span>{t.disclaimerBody}</span>
      </div>

      {view === 'methods' ? (
        <MethodsPage
          t={t}
          validation={estimates.meta.validation}
          generatedOn={rackets.meta.generated_on}
          onBack={() => setView('main')}
        />
      ) : (
        <>
      <section className="controls" aria-label="filters">
        <input
          className="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
        />
        <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label={t.allBrands}>
          <option value="all">{t.allBrands}</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label={t.allGrades}>
          <option value="all">{t.allGrades}</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <label className="check"><input type="checkbox" checked={hasEstimate} onChange={(e) => setHasEstimate(e.target.checked)} /> {t.onlyEstimate}</label>
        <label className="check"><input type="checkbox" checked={mvpOnly} onChange={(e) => setMvpOnly(e.target.checked)} /> {t.onlyMvp}</label>
        <span className="count">{filtered.length} / {rackets.rackets.length}</span>
      </section>

      <div className="content">
        <RacketTable
          rackets={filtered}
          estimates={estimates.rackets}
          selectedId={selectedId}
          onSelect={setSelectedId}
          t={t}
          lang={lang}
        />
        <RacketDetail
          racket={selected}
          estimate={selectedEstimate}
          allRackets={rackets.rackets}
          onSelect={setSelectedId}
          t={t}
          lang={lang}
        />
      </div>

      <ScatterPlot estimates={estimates.rackets} selectedId={selectedId} onSelect={setSelectedId} t={t} lang={lang} />
        </>
      )}

      <footer className="footer">
        <span>{t.footer.data(rackets.meta.counts.rackets, rackets.meta.counts.mvp, estimates.meta.product_round)}</span>
        <span>{t.footer.status(estimates.meta.status)}</span>
      </footer>
    </div>
  )
}
