import { useMemo, useState } from 'react'
import type { LayerSpecification } from 'maplibre-gl'
import { Icon } from '../ui/Icon'
import { MapView } from '../ui/MapView'
import { NodeDrawer } from '../app/NodeDrawer'
import { Badge, Banner, Card, Drawer, Flag, KpiCard, Modal, PageHeader, SectionTitle } from '../ui/kit'
import { useStore } from '../data/store'
import { TODAY } from '../data/seed'
import {
  ALERT_LEVEL_META,
  ALERTS,
  ANOMALIES,
  ATTENTION_META,
  attentionFor,
  BAND_META,
  CHRONIC,
  chronicHotspots,
  EARTH_LAYER_META,
  FIRES,
  HAZARD_META,
  HAZARDS,
  NATURAL_EVENTS,
  RISK_LEVELS,
  SIGNAL_STATE_META,
  type EarthSignalKind,
  type SignalState,
} from '../data/earth'
import { circlePoly, NODE_COORDS } from '../data/geo'

const EARTH_BOUNDS: [[number, number], [number, number]] = [
  [2, -36],
  [138, 56],
]

const hoursLeft = (expires: string) => Math.round((new Date(expires.replace(' ', 'T')).getTime() - TODAY.getTime()) / 3_600_000)

type LayerToggle = Record<'alerts' | 'events' | 'anomalies' | 'fire', boolean>

export function EarthWatch() {
  const { nodes, findings, signalStates, setSignalState, selectNode, pushToast, openVera, go } = useStore()
  const [toggles, setToggles] = useState<LayerToggle>({ alerts: true, events: true, anomalies: true, fire: true })
  const [selectedSignal, setSelectedSignal] = useState<{ kind: EarthSignalKind; id: string } | null>(null)
  const [pendingAction, setPendingAction] = useState<{ id: string; state: SignalState; label: string } | null>(null)
  const [note, setNote] = useState('')

  const live = (id: string) => {
    const s = signalStates[id]?.state ?? 'new'
    return s !== 'closed' && s !== 'not_relevant'
  }

  const liveAlerts = ALERTS.filter((a) => live(a.id) && hoursLeft(a.expires) > 0)
  const ongoingEvents = NATURAL_EVENTS.filter((e) => e.status === 'ongoing' && live(e.id))
  const liveAnomalies = ANOMALIES.filter((a) => live(a.id))
  const liveFires = FIRES.filter((f) => live(f.id))
  const reviewsDue = CHRONIC.filter((c) => c.reviewDue).length

  // ---- map sources ----
  const sources = useMemo(() => {
    const entityFc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: nodes.map((n) => {
        const att = attentionFor(n.id, signalStates)
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: NODE_COORDS[n.id] },
          properties: {
            id: n.id,
            label: att.level === 'quiet' ? '' : n.name.length > 24 ? `${n.name.slice(0, 22)}…` : n.name,
            ring: ATTENTION_META[att.level].ring,
            ringW: att.level === 'quiet' ? 1.2 : 2.6,
            level: att.level,
          },
        }
      }),
    }
    const areaFeatures: GeoJSON.Feature[] = []
    if (toggles.alerts)
      liveAlerts.forEach((a) =>
        areaFeatures.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [circlePoly(a.center, a.radiusKm)] },
          properties: { color: ALERT_LEVEL_META[a.level].color, kind: 'alert' },
        }),
      )
    if (toggles.anomalies)
      liveAnomalies.forEach((a) =>
        areaFeatures.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [circlePoly(a.center, a.radiusKm)] },
          properties: { color: BAND_META[a.band].color, kind: 'anomaly' },
        }),
      )
    const eventFc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: toggles.events
        ? NATURAL_EVENTS.filter((e) => live(e.id)).map((e) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
            properties: { id: e.id, color: e.status === 'ongoing' ? '#7E2A24' : '#9CA3AF', r: e.status === 'ongoing' ? 8 : 6 },
          }))
        : [],
    }
    const fireFc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: toggles.fire
        ? liveFires.flatMap((f) => {
            const [lon, lat] = NODE_COORDS[f.nodeId]
            const d = f.distanceKm / 111
            const cx = lon + d * 0.8
            const cy = lat + d * 0.55
            return Array.from({ length: f.detections }, (_, i) => {
              const ang = i * 2.399963
              const r = 0.02 + (i % 5) * 0.014
              return {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [cx + r * Math.cos(ang) * 3, cy + r * Math.sin(ang) * 2] },
                properties: { id: f.id },
              }
            })
          })
        : [],
    }
    return { 'earth-areas': { type: 'FeatureCollection', features: areaFeatures } as GeoJSON.FeatureCollection, 'earth-events': eventFc, 'earth-fire': fireFc, 'earth-entities': entityFc }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, signalStates, toggles])

  const layers = useMemo<LayerSpecification[]>(
    () => [
      {
        id: 'earth-areas-fill',
        type: 'fill',
        source: 'earth-areas',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.09 },
      },
      {
        id: 'earth-areas-line',
        type: 'line',
        source: 'earth-areas',
        paint: { 'line-color': ['get', 'color'], 'line-width': 1.2, 'line-opacity': 0.5, 'line-dasharray': [2, 2] },
      },
      {
        id: 'earth-fire-pts',
        type: 'circle',
        source: 'earth-fire',
        paint: { 'circle-radius': 3, 'circle-color': '#EA580C', 'circle-opacity': 0.85, 'circle-stroke-color': '#FFF7ED', 'circle-stroke-width': 0.8 },
      },
      {
        id: 'earth-event-pts',
        type: 'circle',
        source: 'earth-events',
        paint: {
          'circle-radius': ['get', 'r'],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.9,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 1.5,
        },
      },
      {
        id: 'earth-entities-c',
        type: 'circle',
        source: 'earth-entities',
        paint: {
          'circle-radius': 6,
          'circle-color': '#FFFFFF',
          'circle-stroke-color': ['get', 'ring'],
          'circle-stroke-width': ['get', 'ringW'],
        },
      },
      {
        id: 'earth-entities-label',
        type: 'symbol',
        source: 'earth-entities',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-font': ['Montserrat Regular'],
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: { 'text-color': '#18627E', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.2 },
      },
    ],
    [],
  )

  const hoverHtml = (layerId: string, props: Record<string, unknown>) => {
    if (layerId === 'earth-entities-c') {
      const n = nodes.find((x) => x.id === props.id)
      if (!n) return null
      const att = attentionFor(n.id, signalStates)
      return `<b>${n.name}</b><br/>${n.country} · Attention: <b style="color:${ATTENTION_META[att.level].color}">${ATTENTION_META[att.level].label}</b>${
        att.rules.length ? `<br/>${att.rules[0]}` : ''
      }`
    }
    if (layerId === 'earth-event-pts') {
      const e = NATURAL_EVENTS.find((x) => x.id === props.id)
      return e ? `<b>${e.magnitude}</b><br/>${e.occurredOn} · ${e.status}` : null
    }
    return null
  }

  const requestAction = (id: string, state: SignalState, label: string) => {
    setPendingAction({ id, state, label })
    setNote('')
  }

  const confirmAction = () => {
    if (!pendingAction) return
    setSignalState(pendingAction.id, pendingAction.state, note || 'No note added.')
    pushToast({
      kind: 'success',
      title: `${pendingAction.label} recorded`,
      detail: 'Signal lifecycle updated and logged. Compliance packs and findings are untouched — by design.',
    })
    setPendingAction(null)
    setSelectedSignal(null)
  }

  const flagged = nodes
    .map((n) => ({ node: n, att: attentionFor(n.id, signalStates) }))
    .filter((x) => x.att.level !== 'quiet')
    .sort((a, b) => (a.att.level === 'active' ? -1 : 1) - (b.att.level === 'active' ? -1 : 1))

  return (
    <>
      <PageHeader
        title="Earth watch"
        description="Outside-in physical monitoring of the chain's geography — climate baselines, anomalies, weather alerts, natural events and fire. Watched continuously, mapped onto your entities, and kept strictly apart from compliance risk."
        context={
          <>
            <span className="chip border border-earth-border bg-earth-soft text-earth-deep">
              <Icon name="globe" className="h-3 w-3" />
              Outside-in ledger
            </span>
            <span className="chip bg-muted text-slate-700">5 layers · native scales only</span>
            <span className="chip bg-soft-green text-status-success">Never blended with compliance risk</span>
          </>
        }
        actions={
          <button onClick={() => openVera('What physical signals affect our chain right now?')} className="btn btn-md btn-ai-soft">
            <Icon name="sparkles" className="h-4 w-4" />
            Assess exposure
          </button>
        }
      />

      {/* One tile per layer — deliberately no total (Rule 2/3). */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Live weather alerts" value={liveAlerts.length} icon="radar" tone="red" sub="Agency scale: Advisory · Watch · Warning" />
        <KpiCard label="Ongoing events" value={ongoingEvents.length} icon="globe" tone="amber" sub="Observed, with distance to asset" />
        <KpiCard label="Active anomalies" value={liveAnomalies.length} icon="trend" tone="blue" sub="Deviation vs the 30-year normal" />
        <KpiCard label="Fire clusters" value={liveFires.length} icon="flame" tone="amber" sub="Thermal detections near assets" />
        <KpiCard label="Chronic reviews due" value={reviewsDue} icon="clock" tone="plain" sub="Baseline ratings past cadence" />
      </div>

      <div className="mb-5">
        <Banner
          tone="info"
          icon="info"
          title="Two ledgers, never one number"
          body="Physical exposure and evidence confidence meet side by side at the entity level and are never summed. The only cross-layer synthesis is the attention flag — a rule-based maximum, and every flag shows the rule that raised it."
        />
      </div>

      {/* ---- the board ---- */}
      <Card className="mb-6" pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-base px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(toggles) as (keyof LayerToggle)[]).map((k) => (
              <button
                key={k}
                onClick={() => setToggles((t) => ({ ...t, [k]: !t[k] }))}
                className={`chip border transition-colors ${
                  toggles[k] ? 'border-earth-border bg-earth-soft text-earth-deep' : 'border-border-base bg-white text-muted-fg'
                }`}
              >
                <Icon
                  name={k === 'alerts' ? 'radar' : k === 'events' ? 'globe' : k === 'anomalies' ? 'trend' : 'flame'}
                  className="h-3 w-3"
                />
                {k === 'alerts' ? 'Weather alerts' : k === 'events' ? 'Natural events' : k === 'anomalies' ? 'Anomalies' : 'Fire'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-fg">
            {(['quiet', 'watch', 'active'] as const).map((l) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 bg-white" style={{ borderColor: ATTENTION_META[l].ring }} />
                {ATTENTION_META[l].label}
              </span>
            ))}
          </div>
        </div>
        <MapView
          height={480}
          bounds={EARTH_BOUNDS}
          sources={sources}
          layers={layers}
          interactive={['earth-entities-c', 'earth-event-pts']}
          onFeatureClick={(layerId, props) => {
            if (layerId === 'earth-entities-c') selectNode(String(props.id))
            if (layerId === 'earth-event-pts') setSelectedSignal({ kind: 'event', id: String(props.id) })
          }}
          hoverHtml={hoverHtml}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-base px-5 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-fg">
            <span className="font-semibold text-slate-700">On watch or active:</span>
            {flagged.map(({ node, att }) => (
              <button
                key={node.id}
                onClick={() => selectNode(node.id)}
                className="chip border bg-white hover:border-earth"
                style={{ color: ATTENTION_META[att.level].color, borderColor: `${ATTENTION_META[att.level].ring}55` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ATTENTION_META[att.level].color }} />
                {node.name}
              </button>
            ))}
          </div>
          <span className="text-[11.5px] text-muted-fg">Ctrl + scroll to zoom</span>
        </div>
      </Card>

      {/* ---- layer sections, each on its own clock ---- */}
      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <div>
            <SectionTitle sub="Agency forecasts with validity windows — hours to days">Weather alerts</SectionTitle>
            <div className="space-y-3">
              {ALERTS.map((a) => {
                const h = hoursLeft(a.expires)
                const st = signalStates[a.id]?.state ?? 'new'
                const lm = ALERT_LEVEL_META[a.level]
                return (
                  <Card key={a.id} className="cursor-pointer transition-colors hover:border-earth" pad={false}>
                    <button onClick={() => setSelectedSignal({ kind: 'alert', id: a.id })} className="w-full p-4 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="chip" style={{ backgroundColor: lm.tint, color: lm.color }}>
                          {lm.label}
                        </span>
                        <Badge tone={SIGNAL_STATE_META[st].tone}>{SIGNAL_STATE_META[st].label}</Badge>
                        <span className={`num ml-auto text-[11.5px] font-semibold ${h <= 36 ? 'text-status-error' : 'text-muted-fg'}`}>
                          {h > 0 ? `expires in ${h}h` : 'expired'}
                        </span>
                      </div>
                      <div className="mt-2 text-[13.5px] font-semibold leading-snug text-foreground">{a.headline}</div>
                      <div className="mt-1 text-[12px] text-muted-fg">
                        {a.agency} · affects{' '}
                        {a.nodeIds.map((id) => nodes.find((n) => n.id === id)?.name).join(', ')}
                      </div>
                    </button>
                  </Card>
                )
              })}
            </div>
          </div>

          <div>
            <SectionTitle sub="Observed occurrences, in native units, with distance to asset">Natural events</SectionTitle>
            <div className="space-y-3">
              {NATURAL_EVENTS.map((e) => {
                const st = signalStates[e.id]?.state ?? 'new'
                return (
                  <Card key={e.id} className="cursor-pointer transition-colors hover:border-earth" pad={false}>
                    <button onClick={() => setSelectedSignal({ kind: 'event', id: e.id })} className="w-full p-4 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={e.status === 'ongoing' ? 'red' : 'grey'} dot>
                          {e.status === 'ongoing' ? 'Ongoing' : 'Subsided'}
                        </Badge>
                        <Badge tone={SIGNAL_STATE_META[st].tone}>{SIGNAL_STATE_META[st].label}</Badge>
                        <span className="ml-auto text-[11.5px] text-muted-fg">{e.occurredOn.slice(0, 10)}</span>
                      </div>
                      <div className="mt-2 text-[13.5px] font-semibold leading-snug text-foreground">
                        {e.kind === 'earthquake' ? 'Earthquake' : e.kind === 'flood' ? 'Flood' : e.kind} — {e.magnitude}
                      </div>
                      <div className="mt-1 text-[12px] text-muted-fg">
                        {e.distances.map((d) => `${nodes.find((n) => n.id === d.nodeId)?.name} · ${d.km} km`).join(' · ')}
                      </div>
                    </button>
                  </Card>
                )
              })}
            </div>
          </div>

          <div>
            <SectionTitle sub="Thermal detections near assets — the trend is the headline">Fire</SectionTitle>
            {FIRES.map((f) => {
              const node = nodes.find((n) => n.id === f.nodeId)!
              const st = signalStates[f.id]?.state ?? 'new'
              const approaching = f.trendKm[f.trendKm.length - 1] < f.trendKm[0]
              return (
                <Card key={f.id} className="cursor-pointer transition-colors hover:border-earth" pad={false}>
                  <button onClick={() => setSelectedSignal({ kind: 'fire', id: f.id })} className="w-full p-4 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip bg-[#FFF7ED] text-[#C2410C]">
                        <Icon name="flame" className="h-3 w-3" />
                        {approaching ? 'Approaching' : 'Holding'}
                      </span>
                      <Badge tone={SIGNAL_STATE_META[st].tone}>{SIGNAL_STATE_META[st].label}</Badge>
                      <span className="num ml-auto text-[11.5px] font-semibold text-status-error">{f.distanceKm} km</span>
                    </div>
                    <div className="mt-2 text-[13.5px] font-semibold leading-snug text-foreground">
                      Fire cluster near {node.name}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <Sparkline values={f.trendKm} color="#EA580C" />
                      <span className="text-[12px] text-muted-fg">
                        {f.detections} detections · {Math.round(f.confidence * 100)}% confidence · {f.trendKm[0]} → {f.distanceKm} km over{' '}
                        {f.trendKm.length} days
                      </span>
                    </div>
                  </button>
                </Card>
              )
            })}
          </div>
        </div>

        <div>
          <SectionTitle sub="Deviation from the 30-year normal — weeks to months">Climate anomalies</SectionTitle>
          <div className="space-y-3">
            {ANOMALIES.map((a) => {
              const st = signalStates[a.id]?.state ?? 'new'
              const bm = BAND_META[a.band]
              return (
                <Card key={a.id} className="cursor-pointer transition-colors hover:border-earth" pad={false}>
                  <button onClick={() => setSelectedSignal({ kind: 'anomaly', id: a.id })} className="w-full p-4 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip" style={{ backgroundColor: bm.tint, color: bm.color }} title={bm.sigma}>
                        {bm.label}
                      </span>
                      <Badge tone={SIGNAL_STATE_META[st].tone}>{SIGNAL_STATE_META[st].label}</Badge>
                      <span className="ml-auto text-[11.5px] text-muted-fg">{a.window}</span>
                    </div>
                    <div className="mt-2 text-[13.5px] font-semibold leading-snug text-foreground">
                      {a.indicator}: {a.figure}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <Sparkline values={a.trend} color={bm.color} />
                      <span className="text-[12px] text-muted-fg">
                        {a.monthsPersisted} month{a.monthsPersisted > 1 ? 's' : ''} ·{' '}
                        {a.nodeIds.map((id) => nodes.find((n) => n.id === id)?.name).join(', ')}
                      </span>
                    </div>
                  </button>
                </Card>
              )
            })}
          </div>

          <div className="mt-5">
            <SectionTitle sub="Baseline hazard ratings per entity — years, reviewed on a cadence">Chronic climate risk</SectionTitle>
            <Card pad={false}>
              <div className="flex flex-wrap items-center gap-3 border-b border-border-base px-4 py-2.5">
                {RISK_LEVELS.map((l) => (
                  <span key={l.level} className="flex items-center gap-1.5 text-[11px] text-muted-fg">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.solid }} />
                    {l.label}
                  </span>
                ))}
              </div>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="sticky left-0 z-20 border-b border-border-base bg-[#F9FAFB] px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-fg">
                        Entity
                      </th>
                      {HAZARDS.map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap border-b border-border-base bg-[#F9FAFB] px-2 py-2 text-center text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-fg"
                          title={HAZARD_META[h].label}
                        >
                          {HAZARD_META[h].short}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...nodes]
                      .sort((a, b) => maxLevel(b.id) - maxLevel(a.id))
                      .map((n) => (
                        <tr key={n.id}>
                          <td className="sticky left-0 z-10 max-w-[190px] border-b border-border-base bg-white px-3 py-1.5">
                            <button
                              onClick={() => selectNode(n.id)}
                              className="flex w-full items-center gap-1.5 truncate text-left text-[12px] font-medium text-slate-700 hover:text-primary"
                            >
                              <Flag code={n.countryCode} />
                              <span className="truncate">{n.name}</span>
                            </button>
                          </td>
                          {HAZARDS.map((h) => {
                            const r = CHRONIC.find((c) => c.nodeId === n.id && c.hazard === h)!
                            const lvl = RISK_LEVELS[r.level - 1]
                            return (
                              <td
                                key={h}
                                className="border-b border-border-base px-1 py-1 text-center"
                                title={`${HAZARD_META[h].label} · ${lvl.label} · reviewed ${r.reviewedOn}${r.reviewDue ? ' · REVIEW DUE' : ''}`}
                              >
                                <span
                                  className="num inline-flex h-6 w-9 items-center justify-center gap-1 rounded text-[11px] font-semibold"
                                  style={{ backgroundColor: lvl.tint, color: lvl.solid }}
                                >
                                  {r.level}
                                  {r.reviewDue && <Icon name="clock" className="h-3 w-3" />}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ---- signal panel ---- */}
      <SignalPanel
        selected={selectedSignal}
        onClose={() => setSelectedSignal(null)}
        onAction={requestAction}
        openEntity={(id) => {
          setSelectedSignal(null)
          selectNode(id)
        }}
        goSuppliers={() => {
          setSelectedSignal(null)
          go('suppliers')
        }}
        findingsCount={(nodeId) => findings.filter((f) => f.nodeIds.includes(nodeId) && (f.status === 'open' || f.status === 'in_review')).length}
      />

      {/* ---- lifecycle confirmation ---- */}
      <Modal
        open={!!pendingAction}
        onClose={() => setPendingAction(null)}
        title={pendingAction?.label ?? ''}
        description="Your note is recorded in the activity trail. This action updates the signal's lifecycle only — compliance packs, findings and evidence confidence are untouched, by design."
        footer={
          <>
            <button onClick={() => setPendingAction(null)} className="btn btn-md btn-ghost">
              Cancel
            </button>
            <button onClick={confirmAction} className="btn btn-md btn-primary">
              Confirm
            </button>
          </>
        }
      >
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="What did you assess, and what happens next?"
          className="w-full rounded-md border border-border-base px-3 py-2 text-[13px] text-body placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </Modal>

      <NodeDrawer />
    </>
  )
}

function maxLevel(nodeId: string) {
  return Math.max(...CHRONIC.filter((c) => c.nodeId === nodeId).map((c) => c.level))
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 84
  const h = 24
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`).join(' ')
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Signal panel — detail per layer kind, two-ledger context, lifecycle actions
// ---------------------------------------------------------------------------
function SignalPanel({
  selected,
  onClose,
  onAction,
  openEntity,
  goSuppliers,
  findingsCount,
}: {
  selected: { kind: EarthSignalKind; id: string } | null
  onClose: () => void
  onAction: (id: string, state: SignalState, label: string) => void
  openEntity: (nodeId: string) => void
  goSuppliers: () => void
  findingsCount: (nodeId: string) => number
}) {
  const { nodes, signalStates } = useStore()
  if (!selected) return null

  const alert = selected.kind === 'alert' ? ALERTS.find((a) => a.id === selected.id) : undefined
  const event = selected.kind === 'event' ? NATURAL_EVENTS.find((e) => e.id === selected.id) : undefined
  const anomaly = selected.kind === 'anomaly' ? ANOMALIES.find((a) => a.id === selected.id) : undefined
  const fire = selected.kind === 'fire' ? FIRES.find((f) => f.id === selected.id) : undefined

  const title =
    alert?.headline ??
    (event
      ? `${event.kind === 'earthquake' ? 'Earthquake' : 'Flood'} — ${event.magnitude}`
      : anomaly
        ? `${anomaly.indicator}: ${anomaly.figure}`
        : fire
          ? `Fire cluster — ${fire.detections} detections`
          : '')
  const source = alert?.agency ?? event?.source ?? anomaly?.source ?? fire?.source ?? ''
  const narrative = alert?.detail ?? event?.narrative ?? anomaly?.narrative ?? ''
  const nodeIds = alert?.nodeIds ?? event?.distances.map((d) => d.nodeId) ?? anomaly?.nodeIds ?? (fire ? [fire.nodeId] : [])
  const ack = signalStates[selected.id]
  const st = ack?.state ?? 'new'

  return (
    <Drawer
      open
      onClose={onClose}
      title={title}
      badge={
        <>
          <span className="chip border border-earth-border bg-earth-soft text-earth-deep">
            <Icon name={EARTH_LAYER_META[selected.kind].icon} className="h-3 w-3" />
            {EARTH_LAYER_META[selected.kind].label}
          </span>
          {alert && (
            <span className="chip" style={{ backgroundColor: ALERT_LEVEL_META[alert.level].tint, color: ALERT_LEVEL_META[alert.level].color }}>
              {ALERT_LEVEL_META[alert.level].label}
            </span>
          )}
          {anomaly && (
            <span className="chip" style={{ backgroundColor: BAND_META[anomaly.band].tint, color: BAND_META[anomaly.band].color }}>
              {BAND_META[anomaly.band].label} · {BAND_META[anomaly.band].sigma}
            </span>
          )}
          <Badge tone={SIGNAL_STATE_META[st].tone}>{SIGNAL_STATE_META[st].label}</Badge>
        </>
      }
      subtitle={`Source: ${source}`}
      footer={
        <div className="flex flex-wrap gap-2">
          {st === 'new' && (
            <>
              <button onClick={() => onAction(selected.id, 'acknowledged', 'Signal acknowledged')} className="btn btn-sm btn-primary">
                Acknowledge
              </button>
              <button onClick={() => onAction(selected.id, 'monitoring', 'Moved to monitoring')} className="btn btn-sm btn-neutral">
                Monitor
              </button>
              <button onClick={() => onAction(selected.id, 'not_relevant', 'Marked not relevant')} className="btn btn-sm btn-ghost">
                Not relevant
              </button>
            </>
          )}
          {(st === 'acknowledged' || st === 'monitoring') && (
            <button onClick={() => onAction(selected.id, 'closed', 'Signal closed')} className="btn btn-sm btn-primary">
              Close signal
            </button>
          )}
          <button onClick={goSuppliers} className="btn btn-sm btn-neutral ml-auto">
            <Icon name="users" className="h-3.5 w-3.5" />
            Open suppliers
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {narrative && <p className="text-[13px] leading-relaxed text-body">{narrative}</p>}

        {alert && (
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Onset" value={alert.onset} />
            <MiniStat label="Expires" value={`${alert.expires} (${hoursLeft(alert.expires)}h)`} />
          </div>
        )}
        {event && (
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Occurred" value={event.occurredOn} />
            <MiniStat label="Status" value={event.status === 'ongoing' ? 'Ongoing' : 'Subsided'} />
          </div>
        )}
        {fire && (
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Detections" value={String(fire.detections)} />
            <MiniStat label="Confidence" value={`${Math.round(fire.confidence * 100)}%`} />
            <MiniStat label="Distance" value={`${fire.distanceKm} km`} />
          </div>
        )}

        {/* Two ledgers, side by side — Rule 1 embodied. */}
        <div>
          <h4 className="mb-2 text-[12.5px] font-semibold text-slate-700">Affected entities — both ledgers, side by side</h4>
          <div className="space-y-2">
            {nodeIds.map((id) => {
              const n = nodes.find((x) => x.id === id)
              if (!n) return null
              const att = attentionFor(id, signalStates)
              const hot = chronicHotspots(id)
              const fc = findingsCount(id)
              return (
                <div key={id} className="rounded-lg border border-border-base p-3">
                  <button onClick={() => openEntity(id)} className="mb-2 flex w-full items-center gap-2 text-left">
                    <Flag code={n.countryCode} />
                    <span className="flex-1 truncate text-[13px] font-semibold text-foreground hover:text-primary">{n.name}</span>
                    <Icon name="chevronRight" className="h-3.5 w-3.5 text-muted-fg" />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-earth-border bg-earth-soft/50 px-2.5 py-2">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-earth-deep">Physical</div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="chip bg-white" style={{ color: ATTENTION_META[att.level].color }}>
                          {ATTENTION_META[att.level].label}
                        </span>
                        {hot.slice(0, 2).map((h) => (
                          <span key={h.hazard} className="text-[11px] text-earth-deep">
                            {HAZARD_META[h.hazard].short} {RISK_LEVELS[h.level - 1].label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md border border-border-base bg-white px-2.5 py-2">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-fg">Evidence</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-700">
                        <span
                          className="chip"
                          style={{ backgroundColor: 'transparent', color: '#334155', border: '1px solid #E5E7EB' }}
                        >
                          {n.confidence}
                        </span>
                        {fc > 0 ? `${fc} open finding${fc > 1 ? 's' : ''}` : 'No open findings'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-fg">
            These columns are never combined into a score. A cyclone does not change what you can prove; an unproven chain does
            not change the weather.
          </p>
        </div>

        {ack?.note && (
          <div className="rounded-lg border border-border-base bg-[#FAFAFA] px-3.5 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-fg">
              {SIGNAL_STATE_META[st].label} · {ack.by} · {ack.on}
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-body">{ack.note}</p>
          </div>
        )}
      </div>
    </Drawer>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-base px-3 py-2">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.03em] text-muted-fg">{label}</div>
      <div className="num mt-0.5 text-[12.5px] font-medium text-foreground">{value}</div>
    </div>
  )
}
