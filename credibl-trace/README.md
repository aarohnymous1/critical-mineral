# Credibl Trace — Critical Minerals Traceability

A working frontend prototype of the third platform in the Credibl family, alongside
**Credibl Essentials** (climate reporting) and **Credibl ESG** (enterprise sustainability).

It demonstrates a verification-first traceability engine for the **downstream customer** —
the OEM or importer that carries the legal duty but sits furthest from the mine.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

No backend. All state is in memory (Zustand) and resets on reload.

## The scenario

**Northwind Mobility** is placing the NW-7 battery pack on the EU market. The clock reads
21 July 2026: the battery passport is 212 days out, a UFLPA detention is live at Long Beach
with seven days to respond, and the chain is only partly visible past tier 1.

The demo data is a five-tier chain — Pune assembly ← Korean cells ← Chinese cathode and anode
← Korean precursor ← refiners in China, DRC and Indonesia ← mines in Australia, DRC, Indonesia,
Mozambique, Zambia, Myanmar and China.

## The core idea

Everything is a projection of one **evidence graph**:

- **Entities** — mines, ASM sites, traders, smelters, plants, recyclers, with ownership and scheme status
- **Flows** — material movements at three fidelity levels (entity → shipment → lot)
- **Evidence** — assays, certificates, quotas, audits, PCF studies, licences

Every fact carries its rung on the **confidence ladder**: attested → cross-checked →
document-backed → self-declared → missing. That single property drives colour across the
whole product, and it is what regime packs disclose per claim.

## Where AI sits

Fourteen agents in four roles. None of them decides anything — each produces a *finding*
with its reasoning, its sources and a confidence figure, and a person accepts, dismisses or
escalates it. That decision is what writes back into the graph, which is what makes the
audit trail defensible.

| Role | Agents |
|---|---|
| Acquisition | Document Extraction, Supplier Chase |
| Verification | Entity Resolver, Mass Balance Auditor, Document Forensics, Origin Anomaly Detector, PCF Validator, Chain Inference |
| Risk | Ownership Graph, Scheme Monitor, ASM Monitor, Regulatory Horizon |
| Compliance | Regime Reconciler, Recycled Content Engine |

**Ask VERA** (the traceability sibling of Ask EVA in Credibl ESG) answers only from the live
graph and shows the evidence it used.

## Screens

| Screen | What it demonstrates |
|---|---|
| Command centre | Compliance clock, evidence coverage, where visibility breaks by tier |
| Products & BOM | Obligations attach to products; BOM resolves to minerals and chain depth |
| Supply chain map | The graph itself — five tiers, colour by evidence quality, AI-inferred links dashed |
| Suppliers & campaigns | Cascades, gap-specific AI chases, selective disclosure |
| Evidence vault | Extraction with per-field confidence, document forensics, quarantine |
| AI verification | The moat: every finding's full reasoning chain and the human decision loop |
| Agent console | The fourteen agents, precision, on-demand runs, audit log |
| Compliance packs | Eight regimes generated from one evidence base |
| Battery passport | Passport fields with evidence rungs; payload in Catena-X / GBA / UNTP |
| Risk watchtower | External events mapped onto your own entities |

## The loop worth trying

1. Open **AI verification**, pick *Assay certificate ARC-2291 shows signs of fabrication*
2. Read the five-step reasoning chain, then choose **Quarantine document** and add a note
3. Watch the graph update: entity confidence rises, the sidebar badge drops, and the
   passport, due-diligence and UFLPA packs all re-score
4. Open **Compliance packs** → **Generate pack** to see the narrative rebuilt from what
   changed

## Design system

Fuses the two Credibl systems: **Essentials'** layout language (white canvas, IBM Plex Sans,
left sidebar with blue active pill, pill buttons, 8–12px radii, minimal shadows) with
**Enterprise's** status lifecycle, collaboration and assistant patterns. Brand blue `#0A7AEB`
is shared by both and anchors this third platform. Purple `#7C3AED` is added as the AI accent —
it marks every machine-generated surface so users can always tell what a model produced.

All charts are Apache ECharts using the shared `credibl` theme in `src/ui/Chart.tsx`.

## Layout

```
src/
  data/     types.ts (domain model) · seed.ts (scenario) · store.ts (state + VERA)
  ui/       Icon · Logo · kit.tsx (components) · Chart.tsx (ECharts theme)
  app/      Shell.tsx (sidebar + content) · Vera.tsx (assistant)
  pages/    one file per screen
```

Prototype only — figures are illustrative and the AI reasoning is scripted to show the
intended interaction model, not generated at runtime.
