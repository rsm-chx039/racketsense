# RacketSense — badminton racket relative-position reference

A small, reproducible reference for where badminton rackets sit on two axes: **swingweight** and **stiffness**. It is built from pairwise comparisons and instrument readings, with 90% intervals, evidence grades and source links.

> **Reference edition · not independently validated.** The values are model estimates, not a validated ranking, and do not replace play-testing. Subjective stiffness is always shown as insufficient evidence.

## What is here

- `public/data/rackets.json` — 774 master rows: official specs, aliases, MVP flag, whether an estimate exists.
- `public/data/estimates.json` — 100 MVPs: per-axis estimates, 90% intervals, evidence grade (A/B/C), independent source count, `bg_only`, and source links.
- `src/` — Vite + React front-end (table, detail, scatter plot, bilingual methods page).

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

Open `/?lang=en` for English or `/?view=methods&lang=en` for the English methods page.

## Data / methods

The site explains why cross-brand official specs are not directly comparable, how the pairwise model works, what A/B/C mean, and the known limitations (single-source dependence, no human gold labels, exploratory holdout). Use the “Methods” button in the header.

The data is rebuilt from the private research repository; this public repository contains only derived values, official specs and links, never raw posts.
