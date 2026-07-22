import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Chart } from '../ui/Chart'
import { MINERAL_META } from '../data/seed'
import { CONFIDENCE_META, FIDELITY_META, NODE_KIND_META, type ChainFlow, type ChainNode } from '../data/types'

// The logical view of the chain: entities arranged by TIER, not geography.
// This is the working surface — structure, dependencies and gaps read at a
// glance, and every node opens the same entity file as the map view.
const TIER_LABELS = ['Own operations', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4 — refining', 'Tier 5 — mining']

export function ChainNodeBoard({
  nodes,
  flows,
  nodeColor,
  selectedNodeId,
  onSelect,
}: {
  nodes: ChainNode[]
  flows: ChainFlow[]
  nodeColor: (id: string) => string
  selectedNodeId: string | null
  onSelect: (id: string) => void
}) {
  const option: EChartsOption = useMemo(
    () => ({
      grid: { left: 30, right: 30, top: 42, bottom: 16, containLabel: false },
      xAxis: { type: 'value', min: 0, max: 103, show: false },
      // Headroom above y=0 so the tier lane labels have somewhere to sit.
      yAxis: { type: 'value', min: -9, max: 104, inverse: true, show: false },
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const q = p as { dataType: string; data: Record<string, unknown> }
          if (q.dataType === 'edge') {
            const fl = flows.find((f) => f.id === q.data.id)
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
          data: nodes.map((n) => {
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
          links: flows.map((f) => ({
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
    [nodes, flows, nodeColor, selectedNodeId],
  )

  const onClick = useMemo(
    () => ({
      type: 'click',
      handler: (p: unknown) => {
        const q = p as { dataType?: string; data?: { id?: string } }
        if (q.dataType === 'node' && q.data?.id) onSelect(q.data.id)
      },
    }),
    [onSelect],
  )

  return <Chart option={option} height={520} onEvent={onClick} />
}
