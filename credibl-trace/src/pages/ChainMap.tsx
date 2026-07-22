import { useMemo, useState } from 'react'
import type { LayerSpecification } from 'maplibre-gl'
import { Icon } from '../ui/Icon'
import { MapView } from '../ui/MapView'
import { NodeDrawer } from '../app/NodeDrawer'
import {
  AiTag,
  Badge,
  Banner,
  Card,
  CardTitle,
  ConfidenceLegend,
  Flag,
  KpiCard,
  PageHeader,
  Progress,
  Segmented,
} from '../ui/kit'
import { useConfidence, useMetrics, useStore } from '../data/store'
import { MINERAL_META } from '../data/seed'
import { CONFIDENCE_META, NODE_KIND_META, RISK_FLAG_META } from '../data/types'
import { arc, CHAIN_BOUNDS, NODE_COORDS } from '../data/geo'

type ColorBy = 'confidence' | 'risk' | 'mineral'

export function ChainMap() {
  const { nodes, flows, findings, selectedNodeId, selectNode, acceptInferredFlow, pushToast, openVera, go, selectFinding } =
    useStore()
  const m = useMetrics()
  const counts = useConfidence()
  const [colorBy, setColorBy] = useState<ColorBy>('confidence')
  const [mineral, setMineral] = useState<string>('all')
  const [showInferred, setShowInferred] = useState(true)

  const visibleNodes = useMemo(
    () => (mineral === 'all' ? nodes : nodes.filter((n) => n.minerals.includes(mineral))),
    [nodes, mineral],
  )
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes])
  const visibleFlows = useMemo(
    () =>
      flows.filter(
        (f) =>
          visibleIds.has(f.from) &&
          visibleIds.has(f.to) &&
          (mineral === 'all' || f.mineral === mineral) &&
          (showInferred || f.status !== 'ai_inferred'),
      ),
    [flows, visibleIds, mineral, showInferred],
  )

  const nodeColor = (id: string) => {
    const n = nodes.find((x) => x.id === id)!
    if (colorBy === 'confidence') return CONFIDENCE_META[n.confidence].color
    if (colorBy === 'risk') {
      if (n.riskFlags.some((r) => RISK_FLAG_META[r].severity === 'critical')) return '#DC2626'
      if (n.riskFlags.length > 0) return '#D97706'
      return '#16A34A'
    }
    return MINERAL_META[n.minerals[0]]?.color ?? '#73778C'
  }

  // ---- GeoJSON sources: real geography replaces tier lanes ----
  const sources = useMemo(() => {
    const nodeFc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: visibleNodes.map((n) => {
        const sel = n.id === selectedNodeId
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: NODE_COORDS[n.id] },
          properties: {
            id: n.id,
            label: n.name.length > 26 ? `${n.name.slice(0, 24)}…` : n.name,
            color: nodeColor(n.id),
            r: n.kind === 'own' ? 9 : n.tier <= 1 ? 8 : 6.5,
            stroke: sel ? '#0A7AEB' : n.riskFlags.length ? '#DC2626' : '#FFFFFF',
            strokeW: sel ? 3 : n.riskFlags.length ? 1.8 : 1.4,
          },
        }
      }),
    }
    const flowFc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: visibleFlows.map((f) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: arc(NODE_COORDS[f.from], NODE_COORDS[f.to]) },
        properties: {
          id: f.id,
          style: f.status === 'ai_inferred' ? 'dashed' : f.status === 'disputed' ? 'dotted' : 'solid',
          color: f.status === 'ai_inferred' ? '#7C3AED' : f.status === 'disputed' ? '#DC2626' : '#94A3B8',
          width: f.fidelity === 'lot' ? 2.2 : f.fidelity === 'shipment' ? 1.6 : 1.1,
        },
      })),
    }
    return { 'chain-flows': flowFc, 'chain-nodes': nodeFc }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleNodes, visibleFlows, selectedNodeId, colorBy])

  const layers = useMemo<LayerSpecification[]>(
    () => [
      {
        id: 'flows-solid',
        type: 'line',
        source: 'chain-flows',
        filter: ['==', ['get', 'style'], 'solid'],
        paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': 0.55 },
      },
      {
        id: 'flows-dashed',
        type: 'line',
        source: 'chain-flows',
        filter: ['==', ['get', 'style'], 'dashed'],
        paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': 0.9, 'line-dasharray': [1.6, 1.6] },
      },
      {
        id: 'flows-dotted',
        type: 'line',
        source: 'chain-flows',
        filter: ['==', ['get', 'style'], 'dotted'],
        paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': 0.8, 'line-dasharray': [0.4, 1.6] },
      },
      {
        id: 'chain-nodes-c',
        type: 'circle',
        source: 'chain-nodes',
        paint: {
          'circle-radius': ['get', 'r'],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': ['get', 'stroke'],
          'circle-stroke-width': ['get', 'strokeW'],
        },
      },
      {
        id: 'chain-nodes-label',
        type: 'symbol',
        source: 'chain-nodes',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-font': ['Montserrat Regular'],
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: { 'text-color': '#334155', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.2 },
      },
    ],
    [],
  )

  const hoverHtml = (layerId: string, props: Record<string, unknown>) => {
    if (layerId !== 'chain-nodes-c') return null
    const n = nodes.find((x) => x.id === props.id)
    if (!n) return null
    return `<b>${n.name}</b><br/>${NODE_KIND_META[n.kind].label} · ${n.country} · Tier ${n.tier}<br/>Evidence coverage <b>${n.coverage}%</b> · ${CONFIDENCE_META[n.confidence].short}${
      n.riskFlags.length ? `<br/><span style="color:#DC2626">${n.riskFlags.length} risk flag(s)</span>` : ''
    }`
  }

  const inferredList = flows.filter((f) => f.status === 'ai_inferred')

  return (
    <>
      <PageHeader
        title="Supply chain map"
        description="Every entity at its real location, every material flow between them. Colour shows how well each node's facts are evidenced — not merely that we know the name."
        context={
          <>
            <span className="chip bg-muted text-slate-700">{nodes.length} entities</span>
            <span className="chip bg-muted text-slate-700">{flows.length} material flows</span>
            <AiTag label={`${inferredList.length} links inferred by AI`} />
          </>
        }
        actions={
          <button onClick={() => openVera('Where is our cobalt actually coming from?')} className="btn btn-md btn-ai-soft">
            <Icon name="sparkles" className="h-4 w-4" />
            Trace a mineral
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Tiers mapped" value={6} icon="layers" tone="blue" sub="Own operations through to mine level" />
        <KpiCard label="Confirmed links" value={m.confirmedFlows} icon="link" tone="green" sub={`of ${flows.length} total material flows`} />
        <KpiCard
          label="AI-inferred links"
          value={m.inferredFlows}
          icon="sparkles"
          tone="violet"
          sub="Proposed from trade data — awaiting confirmation"
        />
        <KpiCard
          label="Entities with risk flags"
          value={nodes.filter((n) => n.riskFlags.length > 0).length}
          icon="alert"
          tone="amber"
          sub="Screened against schemes, lists and capacity maths"
        />
      </div>

      {inferredList.length > 0 && (
        <div className="mb-5">
          <Banner
            tone="ai"
            icon="sparkles"
            title={`${inferredList.length} chain links are inferred, not declared`}
            body="Where suppliers went silent, Chain Inference proposed the most probable path from customs volumes, capacity and timing. Dashed purple on the map. Confirm or reject each one — they are never published to a regime pack while unconfirmed."
          />
        </div>
      )}

      <Card className="mb-5" pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-base px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              value={colorBy}
              onChange={setColorBy}
              items={[
                { id: 'confidence', label: 'Evidence quality' },
                { id: 'risk', label: 'Risk' },
                { id: 'mineral', label: 'Mineral' },
              ]}
            />
            <select value={mineral} onChange={(e) => setMineral(e.target.value)} className="field h-8 w-auto text-[12.5px]">
              <option value="all">All minerals</option>
              {Object.entries(MINERAL_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-slate-700">
              <input
                type="checkbox"
                checked={showInferred}
                onChange={(e) => setShowInferred(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border-strong accent-[#7C3AED]"
              />
              Show inferred links
            </label>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-fg">
            <span className="flex items-center gap-1.5">
              <span className="h-px w-5 bg-slate-400" /> declared
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-5 border-t border-dashed border-ai" /> AI-inferred
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-5 border-t border-dotted border-risk" /> disputed
            </span>
          </div>
        </div>
        <MapView
          height={520}
          bounds={CHAIN_BOUNDS}
          sources={sources}
          layers={layers}
          interactive={['chain-nodes-c']}
          onFeatureClick={(_, props) => selectNode(String(props.id))}
          hoverHtml={hoverHtml}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-base px-5 py-3">
          {colorBy === 'confidence' ? (
            <ConfidenceLegend counts={counts} />
          ) : colorBy === 'risk' ? (
            <div className="flex items-center gap-4 text-[11.5px] text-muted-fg">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#16A34A]" /> No flags
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#D97706]" /> Flagged
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#DC2626]" /> Critical flag
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-muted-fg">
              {Object.entries(MINERAL_META)
                .slice(0, 8)
                .map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.color }} />
                    {v.label}
                  </span>
                ))}
            </div>
          )}
          <span className="text-[11.5px] text-muted-fg">Ctrl + scroll to zoom · click any node for its evidence file</span>
        </div>
      </Card>

      {/* ---- inferred link queue ---- */}
      {inferredList.length > 0 && (
        <Card>
          <CardTitle
            icon="sparkles"
            sub="Each proposal shows the evidence behind it and the probability. Nothing enters a compliance pack until a person confirms it."
          >
            Inferred links awaiting confirmation
          </CardTitle>
          <div className="space-y-3">
            {inferredList.map((fl) => {
              const from = nodes.find((n) => n.id === fl.from)!
              const to = nodes.find((n) => n.id === fl.to)!
              return (
                <div key={fl.id} className="rounded-lg border border-ai-border bg-ai-soft/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-foreground">
                        <Flag code={from.countryCode} />
                        {from.name}
                        <Icon name="arrowRight" className="h-3.5 w-3.5 text-ai" />
                        <Flag code={to.countryCode} />
                        {to.name}
                        <Badge tone="violet">{MINERAL_META[fl.mineral]?.label ?? fl.mineral}</Badge>
                      </div>
                      <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-muted-fg">{fl.inference?.basis}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[11.5px] font-medium text-ai-deep">{fl.inference?.agent}</span>
                        <div className="w-24">
                          <Progress value={(fl.inference?.probability ?? 0) * 100} tone="violet" height={4} />
                        </div>
                        <span className="num text-[11.5px] font-semibold text-ai-deep">
                          {Math.round((fl.inference?.probability ?? 0) * 100)}% probable
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => {
                          acceptInferredFlow(fl.id)
                          pushToast({
                            kind: 'success',
                            title: 'Link confirmed',
                            detail: `${from.name} → ${to.name} is now part of the declared chain.`,
                          })
                        }}
                        className="btn btn-sm btn-primary"
                      >
                        Confirm link
                      </button>
                      <button
                        onClick={() => {
                          const rel = findings.find((f) => f.flowIds.includes(fl.id))
                          if (rel) {
                            selectFinding(rel.id)
                            go('verification')
                          }
                        }}
                        className="btn btn-sm btn-neutral"
                      >
                        See evidence
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <NodeDrawer />
    </>
  )
}
