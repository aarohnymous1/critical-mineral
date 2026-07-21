# Critical Minerals Traceability

**▶ Live demo: https://aarohnymous1.github.io/critical-mineral/**

Prototype work for a critical-minerals traceability platform aimed at **downstream customers** —
the OEMs and importers that carry the legal duty to prove provenance but sit furthest from the mine.

## What's here

**[`credibl-trace/`](credibl-trace/)** — a working frontend prototype (Vite + React + TypeScript +
Tailwind + ECharts + Zustand, in-memory state, no backend).

```bash
cd credibl-trace
npm install
npm run dev      # http://localhost:5173
```

See [credibl-trace/README.md](credibl-trace/README.md) for the scenario, the screens, and the
demo loop worth trying.

## The idea in short

Everything is a projection of one **evidence graph** — entities, material flows and documents —
where every fact carries its rung on a confidence ladder: *attested → cross-checked →
document-backed → self-declared → missing*.

Three consequences fall out of that:

1. **Verification is the product, not tracking.** Knowing the path a mineral took is the entry
   ticket; the value is in what you can verify about each node — forged-certificate detection,
   mass-balance plausibility maths, entity resolution against facility registers, origin anomaly
   detection.
2. **One evidence base, many regimes.** Battery passport, UFLPA rebuttal, Section 232 smelt-and-cast,
   FEOC traced value, CMRT, recycled content and due-diligence reporting are all generated from the
   same graph rather than collected separately.
3. **AI proposes, people decide.** Fourteen agents raise findings with their full reasoning and a
   confidence figure. None of them acts. The human decision is what writes back to the graph — which
   is what makes the audit trail defensible.

## Deployment

Pushing to `main` builds and publishes the prototype to GitHub Pages automatically
(`.github/workflows/deploy.yml`). The `GITHUB_PAGES` env var switches Vite's base path to the
repo subpath for production; local dev stays at the root.

## Status

Prototype for concept validation. Figures are illustrative, the scenario is fictional, and the AI
reasoning is scripted to demonstrate the interaction model rather than generated at runtime.
