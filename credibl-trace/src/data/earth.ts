// ---------------------------------------------------------------------------
// Earth Watch — the outside-in ledger.
//
// This module is deliberately separate from the evidence graph (seed.ts).
// It describes the physical world around the chain's geography: chronic
// climate risk, climate anomalies, weather alerts, natural events and fire.
//
// Demarcation rules (see earth-watch-spec.md §3):
//  - each layer keeps its NATIVE severity scale; nothing here is ever summed
//    into a composite score
//  - signals are observations, not findings — they carry an acknowledgement
//    lifecycle, never an accept/dismiss verdict
//  - nothing in this module writes to nodes, flows, findings or packs
// ---------------------------------------------------------------------------
import { NODES } from './seed'

// --------------------------------------------------------------------------
// Layer 1 · Chronic climate risk (baseline ratings, years)
// --------------------------------------------------------------------------
export type ChronicHazard =
  | 'water_stress'
  | 'extreme_heat'
  | 'riverine_flood'
  | 'coastal_flood'
  | 'cyclone'
  | 'wildfire'
  | 'drought'
  | 'seismic'

export const HAZARD_META: Record<ChronicHazard, { label: string; short: string }> = {
  water_stress: { label: 'Water stress', short: 'Water' },
  extreme_heat: { label: 'Extreme heat', short: 'Heat' },
  riverine_flood: { label: 'Riverine flood', short: 'R. flood' },
  coastal_flood: { label: 'Coastal flood', short: 'C. flood' },
  cyclone: { label: 'Cyclone', short: 'Cyclone' },
  wildfire: { label: 'Wildfire', short: 'Fire' },
  drought: { label: 'Drought', short: 'Drought' },
  seismic: { label: 'Seismic', short: 'Seismic' },
}

export const HAZARDS: ChronicHazard[] = [
  'water_stress',
  'extreme_heat',
  'riverine_flood',
  'coastal_flood',
  'cyclone',
  'wildfire',
  'drought',
  'seismic',
]

/** 5-level chronic scale — its own vocabulary, never mixed with any other. */
export const RISK_LEVELS = [
  { level: 1, label: 'Low', solid: '#4EA53F', tint: '#E8F5E9' },
  { level: 2, label: 'Low–Medium', solid: '#C5D63F', tint: '#F4F7E3' },
  { level: 3, label: 'Medium', solid: '#F9A825', tint: '#FFF6E5' },
  { level: 4, label: 'High', solid: '#EA3D2F', tint: '#FDE9E7' },
  { level: 5, label: 'Extremely High', solid: '#7E2A24', tint: '#F1E2E0' },
] as const

export interface ChronicRating {
  nodeId: string
  hazard: ChronicHazard
  level: 1 | 2 | 3 | 4 | 5
  source: string
  reviewedOn: string
  reviewDue?: boolean
}

// Country-level base profile, then hand-authored hotspots per entity.
const COUNTRY_BASE: Record<string, Partial<Record<ChronicHazard, 1 | 2 | 3 | 4 | 5>>> = {
  IN: { water_stress: 4, extreme_heat: 4, riverine_flood: 3, drought: 3, seismic: 2, cyclone: 2 },
  KR: { cyclone: 3, coastal_flood: 3, extreme_heat: 2, riverine_flood: 2 },
  DE: { riverine_flood: 2, extreme_heat: 2 },
  CN: { water_stress: 3, extreme_heat: 3, riverine_flood: 3, drought: 3, seismic: 2 },
  ID: { seismic: 4, riverine_flood: 3, coastal_flood: 3, extreme_heat: 2 },
  KZ: { drought: 3, extreme_heat: 2, seismic: 3, water_stress: 3 },
  CD: { drought: 3, extreme_heat: 3, water_stress: 2, riverine_flood: 2 },
  ZM: { drought: 4, water_stress: 3, extreme_heat: 3 },
  CH: {},
  AU: { wildfire: 4, drought: 4, water_stress: 4, extreme_heat: 4 },
  MZ: { cyclone: 4, riverine_flood: 3, wildfire: 3, drought: 3 },
  MM: { riverine_flood: 3, cyclone: 3, seismic: 3 },
}

// Entity-level overrides — the authored hotspots that carry the storylines.
const OVERRIDES: Record<string, Partial<Record<ChronicHazard, 1 | 2 | 3 | 4 | 5>>> = {
  'n-kalgoorlie': { water_stress: 5, wildfire: 4, extreme_heat: 4 },
  'n-bangka': { cyclone: 4, coastal_flood: 4, seismic: 3 },
  'n-sulawesi': { seismic: 5, coastal_flood: 4 },
  'n-sorowako': { seismic: 4 },
  'n-cabodelgado': { cyclone: 5, wildfire: 4 },
  'n-kolwezi': { water_stress: 4, drought: 4 },
  'n-lualaba': { water_stress: 4, drought: 4 },
  'n-kasulo': { water_stress: 4, drought: 4 },
  'n-yunnan': { drought: 4, water_stress: 4 },
  'n-guizhou': { riverine_flood: 4 },
  'n-own-pune': { extreme_heat: 4, water_stress: 4 },
  'n-baotou': { water_stress: 4, drought: 4 },
  'n-bayanobo': { water_stress: 4, drought: 4 },
  'n-mufulira-mine': { drought: 4 },
  'n-mufulira-smelter': { drought: 4 },
  'n-kwangyang': { cyclone: 4, coastal_flood: 4 },
  'n-ulba': { seismic: 4 },
  'n-wastate': { seismic: 3, riverine_flood: 3 },
}

export const CHRONIC: ChronicRating[] = NODES.flatMap((n) =>
  HAZARDS.map((hazard) => {
    const level = OVERRIDES[n.id]?.[hazard] ?? COUNTRY_BASE[n.countryCode]?.[hazard] ?? 1
    // One deliberately stale rating, to demonstrate the review cadence.
    const stale = n.id === 'n-bangka' && hazard === 'cyclone'
    return {
      nodeId: n.id,
      hazard,
      level,
      source: hazard === 'water_stress' ? 'Aqueduct-class baseline' : 'Multi-hazard screening baseline',
      reviewedOn: stale ? '2024-11-02' : '2026-03-15',
      reviewDue: stale || undefined,
    }
  }),
)

// --------------------------------------------------------------------------
// Layer 2 · Climate anomalies (statistical deviation, weeks–months)
// --------------------------------------------------------------------------
export type AnomalyBand = 'unusual' | 'rare' | 'exceptional'

export const BAND_META: Record<AnomalyBand, { label: string; sigma: string; color: string; tint: string }> = {
  unusual: { label: 'Unusual', sigma: '≈1σ from normal', color: '#0A7AEB', tint: '#EFF6FF' },
  rare: { label: 'Rare', sigma: '≈2σ from normal', color: '#D97706', tint: '#FFFBEB' },
  exceptional: { label: 'Exceptional', sigma: '≈3σ from normal', color: '#DC2626', tint: '#FEF2F2' },
}

export interface ClimateAnomaly {
  id: string
  indicator: string
  figure: string
  band: AnomalyBand
  window: string
  monthsPersisted: number
  nodeIds: string[]
  trend: number[]
  source: string
  narrative: string
  center: [number, number]
  radiusKm: number
}

export const ANOMALIES: ClimateAnomaly[] = [
  {
    id: 'an-katanga',
    indicator: 'Rainfall',
    figure: '62% below the 30-year normal',
    band: 'rare',
    window: 'May – Jul 2026',
    monthsPersisted: 3,
    nodeIds: ['n-kolwezi', 'n-lualaba', 'n-kasulo'],
    trend: [-18, -34, -51, -58, -62],
    source: 'CHIRPS-class precipitation record',
    narrative:
      'Third consecutive month of severe rainfall deficit across the Katanga copperbelt. Refining here is hydropower-fed; a continued deficit constrains smelter uptime before it constrains the mines.',
    center: [25.35, -10.65],
    radiusKm: 320,
  },
  {
    id: 'an-yunnan',
    indicator: 'Temperature',
    figure: '+2.8σ August heat, earliest onset on record',
    band: 'exceptional',
    window: 'Jul 2026',
    monthsPersisted: 1,
    nodeIds: ['n-yunnan'],
    trend: [0.4, 1.1, 1.9, 2.8],
    source: 'ERA5-class reanalysis',
    narrative:
      'Exceptional heat over Yunnan. Precedent: the 2022–23 events led to hydropower rationing that curtailed regional smelting for weeks. Gallium refining at this node is exposed to the same grid.',
    center: [102.83, 24.88],
    radiusKm: 260,
  },
]

// --------------------------------------------------------------------------
// Layer 3 · Weather alerts (agency forecasts, hours–days)
// --------------------------------------------------------------------------
export type AlertLevel = 'advisory' | 'watch' | 'warning'

export const ALERT_LEVEL_META: Record<AlertLevel, { label: string; color: string; tint: string; rank: number }> = {
  advisory: { label: 'Advisory', color: '#1E40AF', tint: '#EFF6FF', rank: 1 },
  watch: { label: 'Watch', color: '#B45309', tint: '#FFFBEB', rank: 2 },
  warning: { label: 'Warning', color: '#B91C1C', tint: '#FEF2F2', rank: 3 },
}

export interface WeatherAlert {
  id: string
  agency: string
  phenomenon: 'cyclone' | 'extreme_heat' | 'heavy_rain' | 'wind'
  level: AlertLevel
  onset: string
  expires: string
  nodeIds: string[]
  headline: string
  detail: string
  radiusKm: number
  center: [number, number]
}

export const ALERTS: WeatherAlert[] = [
  {
    id: 'al-bangka',
    agency: 'BMKG (Indonesia)',
    phenomenon: 'cyclone',
    level: 'warning',
    onset: '2026-07-21 06:00',
    expires: '2026-07-22 18:00',
    nodeIds: ['n-bangka'],
    headline: 'Tropical cyclone warning — Bangka Strait',
    detail:
      'Severe tropical storm tracking south-west across the Bangka Strait. Sustained winds 95 km/h, gusts to 130. Port operations suspended; smelter in the projected path. Upgraded from Watch at 06:00 local.',
    radiusKm: 160,
    center: [106.11, -2.13],
  },
  {
    id: 'al-pune',
    agency: 'IMD (India)',
    phenomenon: 'extreme_heat',
    level: 'watch',
    onset: '2026-07-21 00:00',
    expires: '2026-07-24 00:00',
    nodeIds: ['n-own-pune'],
    headline: 'Heat watch — Pune district, 3 days',
    detail:
      'Maximum temperatures forecast 5–7°C above normal for three days. Affects the pack-assembly workforce and cooling load at own operations. Outside-in monitoring includes our own sites, not just suppliers.',
    radiusKm: 110,
    center: [73.86, 18.52],
  },
]

// --------------------------------------------------------------------------
// Layer 4 · Natural events (observations)
// --------------------------------------------------------------------------
export interface NaturalEvent {
  id: string
  kind: 'earthquake' | 'flood' | 'landslide' | 'volcanic'
  magnitude: string
  occurredOn: string
  lat: number
  lon: number
  status: 'ongoing' | 'subsided'
  narrative: string
  source: string
  distances: { nodeId: string; km: number }[]
}

export const NATURAL_EVENTS: NaturalEvent[] = [
  {
    id: 'pe-morowali',
    kind: 'earthquake',
    magnitude: 'M6.1 · depth 24 km',
    occurredOn: '2026-07-20 03:41',
    lat: -2.45,
    lon: 122.2,
    status: 'ongoing',
    narrative:
      'Shallow M6.1 event 38 km from Sulawesi Nickel HPAL. No damage assessment published yet; tailings facilities are the watch item. Note the demarcation: this is the chain’s best-evidenced leg — physical exposure is orthogonal to evidence quality.',
    source: 'USGS-class seismic feed',
    distances: [
      { nodeId: 'n-sulawesi', km: 38 },
      { nodeId: 'n-sorowako', km: 97 },
    ],
  },
  {
    id: 'pe-guizhou',
    kind: 'flood',
    magnitude: 'Riverine flood · peak 14 Jul',
    occurredOn: '2026-07-12 00:00',
    lat: 26.65,
    lon: 106.63,
    status: 'subsided',
    narrative:
      'Riverine flooding across Guizhou peaked on 14 July and has receded. The manganese sulphate plant reported three lost shifts and no structural damage. Closed after assessment.',
    source: 'GDACS-class event feed',
    distances: [{ nodeId: 'n-guizhou', km: 12 }],
  },
]

// --------------------------------------------------------------------------
// Layer 5 · Fire (detections, now)
// --------------------------------------------------------------------------
export interface FireSignal {
  id: string
  nodeId: string
  detections: number
  confidence: number
  distanceKm: number
  trendKm: number[]
  firstDetected: string
  lastDetected: string
  source: string
}

export const FIRES: FireSignal[] = [
  {
    id: 'fs-cabodelgado',
    nodeId: 'n-cabodelgado',
    detections: 14,
    confidence: 0.87,
    distanceKm: 9,
    trendKm: [22, 19, 17, 14, 11, 9],
    firstDetected: '2026-07-15',
    lastDetected: '2026-07-21',
    source: 'FIRMS-class thermal anomaly feed',
  },
]

// --------------------------------------------------------------------------
// Signal lifecycle — observations get acknowledged, never verdicts
// --------------------------------------------------------------------------
export type SignalState = 'new' | 'acknowledged' | 'monitoring' | 'not_relevant' | 'closed'

export const SIGNAL_STATE_META: Record<SignalState, { label: string; tone: 'blue' | 'green' | 'amber' | 'grey' }> = {
  new: { label: 'New', tone: 'blue' },
  acknowledged: { label: 'Acknowledged', tone: 'green' },
  monitoring: { label: 'Monitoring', tone: 'amber' },
  not_relevant: { label: 'Not relevant', tone: 'grey' },
  closed: { label: 'Closed', tone: 'grey' },
}

export interface SignalAck {
  state: SignalState
  by?: string
  on?: string
  note?: string
}

export type EarthSignalKind = 'alert' | 'event' | 'anomaly' | 'fire'

export interface EarthSignalRef {
  id: string
  kind: EarthSignalKind
  title: string
  nodeIds: string[]
}

export const ALL_SIGNALS: EarthSignalRef[] = [
  ...ALERTS.map((a) => ({ id: a.id, kind: 'alert' as const, title: a.headline, nodeIds: a.nodeIds })),
  ...NATURAL_EVENTS.map((e) => ({
    id: e.id,
    kind: 'event' as const,
    title: `${e.kind === 'earthquake' ? 'Earthquake' : e.kind === 'flood' ? 'Flood' : e.kind} — ${e.magnitude}`,
    nodeIds: e.distances.map((d) => d.nodeId),
  })),
  ...ANOMALIES.map((a) => ({ id: a.id, kind: 'anomaly' as const, title: `${a.indicator} anomaly — ${a.figure}`, nodeIds: a.nodeIds })),
  ...FIRES.map((f) => ({ id: f.id, kind: 'fire' as const, title: `Fire cluster — ${f.detections} detections`, nodeIds: [f.nodeId] })),
]

/** Seeded lifecycle states. Anything absent is 'new'. */
export const INITIAL_SIGNAL_STATES: Record<string, SignalAck> = {
  'an-katanga': {
    state: 'monitoring',
    by: 'Anjali Rao',
    on: '2026-07-10 09:20',
    note: 'Tracking monthly. Continuity risk only — compliance position unchanged.',
  },
  'pe-guizhou': {
    state: 'closed',
    by: 'Anjali Rao',
    on: '2026-07-18 14:05',
    note: 'Supplier confirmed three lost shifts, no structural damage. Closing.',
  },
}

// --------------------------------------------------------------------------
// The attention flag — Rule 5: the ONLY cross-layer synthesis, a rule-based
// maximum, never a sum. Every result names the rules that fired.
// --------------------------------------------------------------------------
export type AttentionLevel = 'quiet' | 'watch' | 'active'

export const ATTENTION_META: Record<AttentionLevel, { label: string; color: string; ring: string }> = {
  quiet: { label: 'Quiet', color: '#94A3B8', ring: '#CBD5E1' },
  watch: { label: 'Watch', color: '#D97706', ring: '#F59E0B' },
  active: { label: 'Active', color: '#DC2626', ring: '#EF4444' },
}

export function attentionFor(
  nodeId: string,
  states: Record<string, SignalAck>,
): { level: AttentionLevel; rules: string[] } {
  const live = (id: string) => {
    const s = states[id]?.state ?? 'new'
    return s !== 'closed' && s !== 'not_relevant'
  }
  const activeRules: string[] = []
  const watchRules: string[] = []

  ALERTS.forEach((a) => {
    if (!a.nodeIds.includes(nodeId) || !live(a.id)) return
    if (a.level === 'warning') activeRules.push(`Live Warning-level alert: ${a.headline}`)
    else watchRules.push(`Live ${ALERT_LEVEL_META[a.level].label}-level alert: ${a.headline}`)
  })
  NATURAL_EVENTS.forEach((e) => {
    if (e.status !== 'ongoing' || !live(e.id)) return
    const d = e.distances.find((x) => x.nodeId === nodeId)
    if (!d) return
    if (d.km <= 50) activeRules.push(`Ongoing ${e.kind} within 50 km (${d.km} km)`)
    else if (d.km <= 200) watchRules.push(`Ongoing ${e.kind} within 200 km (${d.km} km)`)
  })
  FIRES.forEach((f) => {
    if (f.nodeId !== nodeId || !live(f.id)) return
    const approaching = f.trendKm.length >= 2 && f.trendKm[f.trendKm.length - 1] < f.trendKm[0]
    if (approaching && f.distanceKm <= 15) activeRules.push(`Fire cluster approaching, now ${f.distanceKm} km`)
    else watchRules.push(`Fire cluster present at ${f.distanceKm} km`)
  })
  ANOMALIES.forEach((a) => {
    if (!a.nodeIds.includes(nodeId) || !live(a.id)) return
    if (a.band !== 'unusual') watchRules.push(`${BAND_META[a.band].label} ${a.indicator.toLowerCase()} anomaly: ${a.figure}`)
  })

  if (activeRules.length) return { level: 'active', rules: activeRules }
  if (watchRules.length) return { level: 'watch', rules: watchRules }
  return { level: 'quiet', rules: [] }
}

/** All live signals touching a node — for the entity drawer's physical panel. */
export function signalsForNode(nodeId: string, states: Record<string, SignalAck>): EarthSignalRef[] {
  return ALL_SIGNALS.filter((s) => {
    const st = states[s.id]?.state ?? 'new'
    return s.nodeIds.includes(nodeId) && st !== 'closed' && st !== 'not_relevant'
  })
}

/** Chronic hazards at High or above for a node — the drawer's mini-strip. */
export function chronicHotspots(nodeId: string): ChronicRating[] {
  return CHRONIC.filter((c) => c.nodeId === nodeId && c.level >= 4).sort((a, b) => b.level - a.level)
}

export const EARTH_LAYER_META: Record<EarthSignalKind, { label: string; icon: string }> = {
  alert: { label: 'Weather alert', icon: 'radar' },
  event: { label: 'Natural event', icon: 'globe' },
  anomaly: { label: 'Climate anomaly', icon: 'trend' },
  fire: { label: 'Fire', icon: 'flame' },
}
