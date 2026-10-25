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

const GLYPH_DOTS = [
  [26, 104], [48, 78], [70, 90], [94, 56], [118, 70], [166, 62], [54, 122],
  [88, 128], [128, 112], [160, 98], [178, 76], [34, 66], [106, 96], [152, 126],
]

function CoordinateGlyph() {
  return (
    <svg className="glyph" viewBox="0 0 200 160" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="199" height="159" rx="14" className="glyph-frame" />
      {[40, 80, 120].map((v) => (
        <line key={`v${v}`} x1={v} y1="12" x2={v} y2="148" className="gline" />
      ))}
      {[40, 80, 120].map((v) => (
        <line key={`h${v}`} x1="12" y1={v} x2="188" y2={v} className="gline" />
      ))}
      {GLYPH_DOTS.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.6" className="g-dot" />
      ))}
      <circle cx="142" cy="42" r="9" className="g-halo" />
      <circle cx="142" cy="42" r="4.2" className="g-dot sel" />
    </svg>
  )
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

  const isMain = view !== 'methods'

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="./">
            <span className="brand-mark" aria-hidden="true">RS</span>
            <span className="brand-text">
              <span className="brand-name">RacketSense</span>
              <span className="brand-sub">racket reference</span>
            </span>
          </a>
          <nav className="nav" aria-label={t.nav.library}>
            <button
              className={isMain ? 'active' : ''}
              aria-current={isMain ? 'page' : undefined}
              onClick={() => setView('main')}
            >
              {t.nav.library}
            </button>
            <button
              className={!isMain ? 'active' : ''}
              aria-current={!isMain ? 'page' : undefined}
              onClick={() => setView('methods')}
            >
              {t.nav.methods}
            </button>
          </nav>
          <div className="topbar-right">
            <span className="ver">{t.version(rackets.meta.generated_on)}</span>
            <div className="lang" role="group" aria-label={t.langLabel}>
              <button className={lang === 'zh' ? 'active' : ''} aria-pressed={lang === 'zh'} onClick={() => setLang('zh')}>中文</button>
              <button className={lang === 'en' ? 'active' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
            </div>
          </div>
        </div>
      </header>

      <main className="app">
        {isMain ? (
          <>
            <section className="hero">
              <div className="hero-main">
                <div className="hero-eyebrow">
                  <span>{t.hero.eyebrow}</span>
                  <span className="dotline" aria-hidden="true" />
                  <span className="hero-date">{t.hero.updated(rackets.meta.generated_on)}</span>
                </div>
                <h1>{t.hero.title}</h1>
                <p className="hero-lead">{t.hero.lead}</p>
                <ul className="hero-stats">
                  <li><b>{rackets.meta.counts.rackets}</b><span>{t.hero.stats.models}</span></li>
                  <li><b>{rackets.meta.counts.mvp}</b><span>{t.hero.stats.mvp}</span></li>
                  <li><b>A · B · C</b><span>{t.hero.stats.grades}</span></li>
                  <li><b>{rackets.meta.generated_on}</b><span>{t.hero.stats.updated}</span></li>
                </ul>
                <p className="hero-notice" role="note">
                  <strong>{t.disclaimerTitle}</strong>
                  <span>{t.disclaimerBody}</span>
                </p>
              </div>
              <CoordinateGlyph />
            </section>

            <section className="toolbar" aria-label="filters">
              <label className="search-field">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.6-3.6" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.search}
                  aria-label={t.search}
                />
              </label>
              <div className="select-wrap">
                <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label={t.allBrands}>
                  <option value="all">{t.allBrands}</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              <div className="seg" role="group" aria-label={t.allGrades}>
                {['all', 'A', 'B', 'C'].map((g) => (
                  <button
                    key={g}
                    className={grade === g ? 'active' : ''}
                    aria-pressed={grade === g}
                    onClick={() => setGrade(g)}
                  >
                    {g === 'all' ? t.gradeAll : g}
                  </button>
                ))}
              </div>
              <label className="chip-toggle">
                <input type="checkbox" checked={hasEstimate} onChange={(e) => setHasEstimate(e.target.checked)} />
                <span>{t.onlyEstimate}</span>
              </label>
              <label className="chip-toggle">
                <input type="checkbox" checked={mvpOnly} onChange={(e) => setMvpOnly(e.target.checked)} />
                <span>{t.onlyMvp}</span>
              </label>
              <span className="count"><strong>{filtered.length}</strong> / {rackets.rackets.length}</span>
            </section>

            <div className="content">
              <section className="table-card">
                <RacketTable
                  rackets={filtered}
                  estimates={estimates.rackets}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  t={t}
                  lang={lang}
                />
              </section>
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
        ) : (
          <MethodsPage
            t={t}
            validation={estimates.meta.validation}
            generatedOn={rackets.meta.generated_on}
            onBack={() => setView('main')}
          />
        )}

        <footer className="footer">
          <span>{t.footer.data(rackets.meta.counts.rackets, rackets.meta.counts.mvp, estimates.meta.product_round)}</span>
          <span>{t.footer.status(estimates.meta.status)}</span>
        </footer>
      </main>
    </>
  )
}
