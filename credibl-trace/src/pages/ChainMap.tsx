import { useCallback, useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { Icon } from '../ui/Icon'
import { Chart } from '../ui/Chart'
import {
  AiTag,
  Badge,
  Banner,
  Card,
  CardTitle,
  ConfidenceBadge,
  ConfidenceLegend,
  Drawer,
  Flag,
  KpiCard,
  MetaRow,
  PageHeader,
  Progress,
  Segmented,
} from '../ui/kit'
import { useConfidence, useMetrics, useStore } from '../data/store'
import { MINERAL_META } from '../data/seed'
import { CONFIDENCE_META, FIDELITY_META, NODE_KIND_META, RISK_FLAG_META } from '../data/types'

type ColorBy = 'confidence' | 'risk' | 'mineral'

const TIER_LABELS = ['Own operations', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4 — refining', 'Tier 5 — mining']

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

  const nodeColor = useCallback(
    (id: string) => {
      const n = nodes.find((x) => x.id === id)!
      if (colorBy === 'confidence') return CONFIDENCE_META[n.confidence].color
      if (colorBy === 'risk') {
        if (n.riskFlags.some((r) => RISK_FLAG_META[r].severity === 'critical')) return '#DC2626'
        if (n.riskFlags.length > 0) return '#D97706'
        return '#16A34A'
      }
      return MINERAL_META[n.minerals[0]]?.color ?? '#73778C'
    },
    [nodes, colorBy],
  )

  const option: EChartsOption = useMemo(
    () => ({
      grid: { left: 30, right: 30, top: 42, bottom: 16, containLabel: false },
      // Headroom above y=0 so the tier lane labels have somewhere to sit.
      xAxis: { type: 'value', min: 0, max: 103, show: false },
      yAxis: { type: 'value', min: -9, max: 104, inverse: true, show: false },
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const q = p as { dataType: string; data: Record<string, unknown> }
          if (q.dataType === 'edge') {
            const fl = visibleFlows.find((f) => f.id === q.data.id)
            if (!fl) return ''
            const from = nodes.find((n) => n.id === fl.from)?.name
            const to = nodes.find((n) => n.id === fl.to)?.name
            return `<b>${from} → ${to}</b><br/>${MINERAL_META[fl.mineral]?.label ?? fl.mineral} · ${
              FIDELITY_META[fl.fidelity].label
            }<br/>${
              fl.status === 'ai_inferred'
                ? `<span style="color:#7C3AED">AI-inferred · ${Math.round((fl.inference?.probability ?? 0) * 100)}% probable</span>`
                : fl.status === 'disputed'
                  ? '<span style="color:#DC2626">Disputed</span>'
                  : 'Declared and confirmed'
            }${fl.volume ? `<br/>${fl.volume.toLocaleString()} ${fl.unit}` : ''}`
          }
          const n = nodes.find((x) => x.id === q.data.id)
          if (!n) return ''
          return `<b>${n.name}</b><br/>${NODE_KIND_META[n.kind].label} · ${n.country}<br/>Evidence coverage <b>${
            n.coverage
          }%</b> · ${CONFIDENCE_META[n.confidence].short}${
            n.riskFlags.length ? `<br/><span style="color:#DC2626">${n.riskFlags.length} risk flag(s)</span>` : ''
          }`
        },
      },
      series: [
        // tier lane labels, drawn in the same coordinate system so they always align
        {
          type: 'scatter',
          coordinateSystem: 'cartesian2d',
          symbolSize: 0,
          silent: true,
          data: [95, 79, 63, 47, 29, 8].map((x, i) => ({
            value: [x, -5],
            label: {
              show: true,
              formatter: TIER_LABELS[i],
              fontSize: 10.5,
              fontWeight: 600,
              color: '#9CA3AF',
              position: 'inside',
            },
          })),
        },
        {
          type: 'graph',
          coordinateSystem: 'cartesian2d',
          roam: false,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 6,
          emphasis: { focus: 'adjacency', scale: false, lineStyle: { width: 2.5 } },
          label: {
            show: true,
            position: 'right',
            distance: 7,
            fontSize: 10,
            color: '#334155',
            width: 96,
            overflow: 'break',
            formatter: (p: unknown) => {
              const q = p as { data: { shortName: string } }
              return q.data.shortName
            },
          },
          data: visibleNodes.map((n) => {
            const isSel = n.id === selectedNodeId
            return {
              id: n.id,
              name: n.name,
              shortName: n.name.length > 26 ? `${n.name.slice(0, 24)}…` : n.name,
              value: [n.x, n.y],
              symbol: n.kind === 'own' ? 'rect' : n.kind === 'mine' || n.kind === 'asm' ? 'diamond' : 'circle',
              symbolSize: n.kind === 'own' ? 20 : n.tier <= 1 ? 17 : 13,
              itemStyle: {
                color: nodeColor(n.id),
                borderColor: isSel ? '#0A7AEB' : n.riskFlags.length ? '#DC2626' : '#FFFFFF',
                borderWidth: isSel ? 3.5 : n.riskFlags.length ? 2 : 1.5,
                shadowBlur: isSel ? 10 : 0,
                shadowColor: 'rgba(10,122,235,0.4)',
              },
              label: { fontWeight: isSel ? 700 : 400, color: isSel ? '#0A7AEB' : '#334155' },
            }
          }),
          links: visibleFlows.map((f) => ({
            id: f.id,
            source: f.from,
            target: f.to,
            lineStyle: {
              color: f.status === 'ai_inferred' ? '#7C3AED' : f.status === 'disputed' ? '#DC2626' : '#94A3B8',
              width: f.fidelity === 'lot' ? 2 : f.fidelity === 'shipment' ? 1.5 : 1,
              type: f.status === 'ai_inferred' ? 'dashed' : f.status === 'disputed' ? 'dotted' : 'solid',
              opacity: f.status === 'ai_inferred' ? 0.9 : 0.7,
              curveness: 0.08,
            },
          })),
        },
      ],
    }),
    [visibleNodes, visibleFlows, nodes, nodeColor, selectedNodeId],
  )

  const onClick = useMemo(
    () => ({
      type: 'click',
      handler: (p: unknown) => {
        const q = p as { dataType?: string; data?: { id?: string } }
        if (q.dataType === 'node' && q.data?.id) selectNode(q.data.id)
      },
    }),
    [selectNode],
  )

  const selected = nodes.find((n) => n.id === selectedNodeId) ?? null
  const inbound = selected ? flows.filter((f) => f.to === selected.id) : []
  const outbound = selected ? flows.filter((f) => f.from === selected.id) : []
  const nodeFindings = selected ? findings.filter((f) => f.nodeIds.includes(selected.id)) : []

  const inferredList = flows.filter((f) => f.status === 'ai_inferred')

  return (
    <>
      <PageHeader
        title="Supply chain map"
        description="Every entity, every material flow, five tiers deep. Colour shows how well each node's facts are evidenced — not merely that we know the name."
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
        <KpiCard
          label="Confirmed links"
          value={m.confirmedFlows}
          icon="link"
          tone="green"
          sub={`of ${flows.length} total material flows`}
        />
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
        <div className="px-3 py-2">
          <Chart option={option} height={480} onEvent={onClick} />
        </div>
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
          <span className="text-[11.5px] text-muted-fg">Click any node for its evidence file</span>
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

      {/* ---- node drawer ---- */}
      <Drawer
        open={!!selected}
        onClose={() => selectNode(null)}
        title={selected?.name ?? ''}
        badge={
          selected && (
            <>
              <ConfidenceBadge c={selected.confidence} showHelp />
              <Badge tone="grey">{NODE_KIND_META[selected.kind].label}</Badge>
              <Badge tone="blue">Tier {selected.tier}</Badge>
            </>
          )
        }
        subtitle={
          selected && (
            <span className="flex items-center gap-1.5">
              <Flag code={selected.countryCode} />
              {selected.country} · {selected.capacity}
            </span>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            {selected.note && (
              <Banner tone={selected.riskFlags.length ? 'warning' : 'info'} icon="info" title="Context" body={selected.note} />
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-slate-700">Evidence coverage</span>
                <span className="num text-[12px] font-semibold text-slate-700">{selected.coverage}%</span>
              </div>
              <Progress
                value={selected.coverage}
                tone={selected.coverage >= 75 ? 'green' : selected.coverage >= 45 ? 'blue' : 'red'}
              />
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-fg">
                {CONFIDENCE_META[selected.confidence].help}
              </p>
            </div>

            <MetaRow
              items={[
                { label: 'Minerals', value: selected.minerals.map((k) => MINERAL_META[k]?.label ?? k).join(', ') },
                { label: 'RMI facility ID', value: selected.rmiId ?? '—' },
                { label: 'Ownership', value: selected.ownership ?? 'Not disclosed' },
                { label: 'Schemes', value: selected.schemes.length ? selected.schemes.join(' · ') : 'None on file' },
              ]}
            />

            {selected.declaredOutput && selected.certifiedInput && (
              <Card className="border-[#FECACA] bg-soft-red">
                <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-status-error">
                  <Icon name="scale" className="h-4 w-4" />
                  Mass balance does not close
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="num text-[17px] font-bold text-foreground">
                      {selected.certifiedInput.value.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-muted-fg">Certified input (t)</div>
                  </div>
                  <div>
                    <div className="num text-[17px] font-bold text-foreground">
                      {selected.declaredOutput.value.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-muted-fg">Declared output (t)</div>
                  </div>
                  <div>
                    <div className="num text-[17px] font-bold text-status-error">
                      {(selected.declaredOutput.value - selected.certifiedInput.value).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-muted-fg">Unexplained (t)</div>
                  </div>
                </div>
              </Card>
            )}

            {selected.riskFlags.length > 0 && (
              <div>
                <h4 className="mb-2 text-[12.5px] font-semibold text-slate-700">Risk flags</h4>
                <ul className="space-y-2">
                  {selected.riskFlags.map((r) => (
                    <li key={r} className="flex items-start gap-2.5 rounded-lg border border-border-base px-3 py-2.5">
                      <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-text" />
                      <div>
                        <div className="text-[12.5px] font-medium text-foreground">{RISK_FLAG_META[r].label}</div>
                        <div className="text-[11.5px] text-muted-fg">Consequence under {RISK_FLAG_META[r].regime}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="mb-2 text-[12.5px] font-semibold text-slate-700">Material flows</h4>
              <div className="space-y-1.5">
                {inbound.map((f) => (
                  <FlowRow key={f.id} flow={f} label={nodes.find((n) => n.id === f.from)?.name ?? ''} dir="in" />
                ))}
                {outbound.map((f) => (
                  <FlowRow key={f.id} flow={f} label={nodes.find((n) => n.id === f.to)?.name ?? ''} dir="out" />
                ))}
                {inbound.length === 0 && outbound.length === 0 && (
                  <p className="text-[12.5px] text-muted-fg">No flows recorded.</p>
                )}
              </div>
            </div>

            {nodeFindings.length > 0 && (
              <div>
                <h4 className="mb-2 text-[12.5px] font-semibold text-slate-700">Open findings on this entity</h4>
                <ul className="space-y-2">
                  {nodeFindings.map((f) => (
                    <li key={f.id}>
                      <button
                        onClick={() => {
                          selectFinding(f.id)
                          go('verification')
                        }}
                        className="flex w-full items-start gap-2.5 rounded-lg border border-border-base px-3 py-2.5 text-left hover:border-primary"
                      >
                        <Icon name="sparkles" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ai" />
                        <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-foreground">{f.title}</span>
                        <Icon name="chevronRight" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-fg" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}

function FlowRow({ flow, label, dir }: { flow: { mineral: string; fidelity: keyof typeof FIDELITY_META; status: string; volume?: number; unit?: string }; label: string; dir: 'in' | 'out' }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border-base px-3 py-2">
      <Icon
        name={dir === 'in' ? 'arrowRight' : 'arrowUpRight'}
        className={`h-3.5 w-3.5 shrink-0 ${dir === 'in' ? 'text-slate-400' : 'text-primary'}`}
      />
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-body">{label}</span>
      <Badge tone={flow.status === 'ai_inferred' ? 'violet' : flow.fidelity === 'lot' ? 'green' : flow.fidelity === 'shipment' ? 'blue' : 'grey'}>
        {flow.status === 'ai_inferred' ? 'Inferred' : FIDELITY_META[flow.fidelity].label}
      </Badge>
      <span className="shrink-0 text-[11.5px] text-muted-fg">{MINERAL_META[flow.mineral]?.label ?? flow.mineral}</span>
    </div>
  )
}
